import { pdfHasHoldingsData } from './pdf-parser';

const PORTAL_ORIGIN = 'https://portal.skandia.com.co';
const CATALOG_URL = `${PORTAL_ORIGIN}/om.rentabilidades.pl/oldmutual`;
const SECURITY_URL = `${PORTAL_ORIGIN}/SkCo.Communications.Web/SkCo/Communications/Web/Security.aspx`;
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const REQUEST_TIMEOUT_MS = 30000;
const MAX_REDIRECTS = 5;
const MAX_PDF_BYTES = 20 * 1024 * 1024;

export interface CatalogPortfolio {
    Id: string;
    LongName: string;
    [key: string]: unknown;
}

export interface CatalogProduct {
    Id: string;
    Origen: string;
    ProductName: string;
    Portfolios?: CatalogPortfolio[] | null;
    [key: string]: unknown;
}

export interface CatalogCategory {
    CategoryName: string;
    Products: CatalogProduct[];
}

export type PortfolioCatalog = CatalogCategory[];

export interface PdfParams {
    origin: string;
    idPortfolio: string;
    idProduct: string;
}

/**
 * Extracts the `data = [...]` array the rentabilidades page embeds in an inline script.
 * Scans to the matching `]` while skipping JSON strings, so brackets inside names don't end the array early.
 */
export function parsePortfolioCatalog(html: string): PortfolioCatalog | null {
    const marker = /\bdata\s*=\s*\[/.exec(html);
    if (!marker) return null;

    const start = marker.index + marker[0].length - 1;
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < html.length; i++) {
        const ch = html[i];
        if (inString) {
            if (escaped) escaped = false;
            else if (ch === '\\') escaped = true;
            else if (ch === '"') inString = false;
            continue;
        }
        if (ch === '"') inString = true;
        else if (ch === '[' || ch === '{') depth++;
        else if (ch === ']' || ch === '}') {
            depth--;
            if (depth === 0) {
                try {
                    const parsed = JSON.parse(html.slice(start, i + 1));
                    return Array.isArray(parsed) ? parsed : null;
                } catch {
                    return null;
                }
            }
        }
    }
    return null;
}

/**
 * Looks up the Security.aspx params for a portfolio. Only the first category is searched
 * (same scope as /api/skandia); other categories reuse some names.
 */
export function findPortfolioPdfParams(catalog: PortfolioCatalog, portfolioName: string): PdfParams | null {
    const products = catalog[0]?.Products ?? [];
    for (const product of products) {
        const portfolio = product.Portfolios?.find(p => p.LongName === portfolioName);
        if (!portfolio) continue;
        const params = { origin: product.Origen, idPortfolio: portfolio.Id, idProduct: product.Id };
        return params.origin && params.idPortfolio && params.idProduct ? params : null;
    }
    return null;
}

/**
 * GET that follows redirects by hand so the cookies Security.aspx sets (ASP.NET_SessionId, Manual_F5)
 * are sent to the next hop; without them the chain ends on the OpenFile.aspx stub instead of the PDF.
 */
async function fetchWithSessionCookies(url: string): Promise<Response | null> {
    const cookies = new Map<string, string>();
    let currentUrl = url;

    // 🛡️ SENTINEL: Cap redirects to prevent redirect-loop DoS.
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        const headers: Record<string, string> = { 'User-Agent': USER_AGENT };
        if (cookies.size > 0) {
            headers['Cookie'] = [...cookies].map(([name, value]) => `${name}=${value}`).join('; ');
        }

        // 🛡️ SENTINEL: AbortSignal.timeout on every hop prevents an indefinite hang (DoS).
        const response = await fetch(currentUrl, {
            headers,
            redirect: 'manual',
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
        });

        const location = response.headers.get('location');
        if (response.status < 300 || response.status >= 400 || !location) {
            return response;
        }

        for (const setCookie of response.headers.getSetCookie()) {
            const pair = setCookie.split(';')[0];
            const eq = pair.indexOf('=');
            if (eq > 0) cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
        }

        const next = new URL(location, currentUrl);
        // 🛡️ SENTINEL: Only follow redirects within the Skandia portal, so a tampered Location can't
        // turn this server into a proxy to other hosts (SSRF) or leak the session cookies.
        if (next.origin !== PORTAL_ORIGIN) {
            console.warn(`[PDF Scraper] Refusing redirect to ${next.origin}.`);
            return null;
        }
        currentUrl = next.toString();
    }

    console.warn(`[PDF Scraper] Too many redirects (> ${MAX_REDIRECTS}).`);
    return null;
}

async function fetchPortfolioCatalog(): Promise<PortfolioCatalog | null> {
    const response = await fetchWithSessionCookies(CATALOG_URL);
    if (!response?.ok) {
        console.error(`[PDF Scraper] Catalog page failed with status ${response?.status ?? 'n/a'}.`);
        return null;
    }
    const catalog = parsePortfolioCatalog(await response.text());
    if (!catalog) console.error('[PDF Scraper] Could not parse the portfolio catalog from the page.');
    return catalog;
}

/**
 * Downloads the ficha técnica over plain HTTP (no browser): params come from the page's embedded catalog,
 * then Security.aspx is fetched for the latest period that has holdings data.
 */
export async function fetchPortfolioPdf(portfolioName: string): Promise<{ buffer: Buffer, url: string } | null> {
    // 🛡️ SENTINEL: Add input length limits to prevent DoS via extremely long portfolio names.
    if (!portfolioName || portfolioName.length > 200) {
        console.warn(`[PDF Scraper] Invalid portfolio name: Name is empty or exceeds maximum length of 200 characters.`);
        return null;
    }

    try {
        const catalog = await fetchPortfolioCatalog();
        if (!catalog) return null;

        const params = findPortfolioPdfParams(catalog, portfolioName);
        if (!params) {
            console.warn(`[PDF Scraper] Portfolio "${portfolioName}" not found or missing PDF params.`);
            return null;
        }
        console.log('[PDF Scraper] Resolved params:', params);

        // Prefer the latest month (period 0) only if its holdings data is already published;
        // otherwise fall back to the previous month (period 1).
        let result = await fetchPdfForPeriod('0', params);
        if (result && await pdfHasHoldingsData(result.buffer)) {
            console.log('[PDF Scraper] Using latest period (0).');
        } else {
            console.log('[PDF Scraper] Period 0 has no holdings data, falling back to period 1.');
            result = await fetchPdfForPeriod('1', params);
        }
        return result;
    } catch (error) {
        console.error('[PDF Scraper] Error:', error);
        return null;
    }
}

export async function getPortfolioPdf(portfolioName: string): Promise<{ pdfBase64: string | null, pdfUrl: string | null }> {
    const result = await fetchPortfolioPdf(portfolioName);
    if (!result) {
        return { pdfBase64: null, pdfUrl: null };
    }
    return {
        pdfBase64: result.buffer.toString('base64'),
        pdfUrl: result.url // We use the security URL as the link
    };
}

async function fetchPdfForPeriod(period: string, params: PdfParams): Promise<{ buffer: Buffer, url: string } | null> {
    // 🛡️ SENTINEL: URLSearchParams prevents SSRF / malformed URLs from the catalog values.
    const urlObj = new URL(SECURITY_URL);
    urlObj.searchParams.set('Origen', params.origin);
    urlObj.searchParams.set('Period', period);
    urlObj.searchParams.set('IdVariable', params.idPortfolio);
    urlObj.searchParams.set('Product', params.idProduct);
    const securityUrl = urlObj.toString();

    console.log(`[PDF Scraper] Fetching PDF for period ${period}: ${securityUrl}`);

    let response: Response | null;
    try {
        response = await fetchWithSessionCookies(securityUrl);
    } catch (error) {
        // Return null instead of throwing so the caller can fall back to another period
        console.error(`[PDF Scraper] Fetch for period ${period} failed:`, error);
        return null;
    }

    if (!response?.ok) {
        console.error(`[PDF Scraper] Fetch for period ${period} failed with status ${response?.status ?? 'n/a'}`);
        return null;
    }

    // 🛡️ SENTINEL: Cap the PDF size to prevent memory exhaustion from oversized responses.
    const declaredLength = Number(response.headers.get('content-length'));
    if (declaredLength > MAX_PDF_BYTES) {
        console.warn(`[PDF Scraper] PDF for period ${period} exceeds ${MAX_PDF_BYTES} bytes.`);
        return null;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_PDF_BYTES) {
        console.warn(`[PDF Scraper] PDF for period ${period} exceeds ${MAX_PDF_BYTES} bytes.`);
        return null;
    }

    // The portal serves the PDF as text/html, so only the %PDF signature is trusted.
    if (!buffer.subarray(0, 1024).includes('%PDF')) {
        console.warn('[PDF Scraper] Response does not look like a PDF (missing %PDF signature).');
        // 🛡️ SENTINEL: Do not log raw response buffers to prevent sensitive data disclosure
        return null;
    }

    console.log(`[PDF Scraper] PDF for period ${period} downloaded successfully.`);
    return { buffer, url: securityUrl };
}
