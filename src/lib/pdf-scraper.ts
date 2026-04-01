import { Browser } from 'puppeteer-core';
import { getBrowser } from './browser';

export async function getPortfolioPdf(portfolioName: string, browserInstance?: Browser): Promise<{ pdfBase64: string | null, pdfUrl: string | null }> {
    // 🛡️ SENTINEL: Add input length limits to prevent DoS via extremely long portfolio names.
    // Extremely long strings processed by Puppeteer evaluate functions can cause excessive
    // memory consumption or timeouts. If the name exceeds the maximum expected length, reject it.
    if (!portfolioName || portfolioName.length > 200) {
        console.warn(`[PDF Scraper] Invalid portfolio name: Name is empty or exceeds maximum length of 200 characters.`);
        return { pdfBase64: null, pdfUrl: null };
    }

    let browser = browserInstance;
    let ownBrowser = false;

    try {
        if (!browser) {
            console.log(`[PDF Scraper] Launching browser for ${portfolioName}...`);
            browser = await getBrowser();
            ownBrowser = true;
        } else {
            console.log(`[PDF Scraper] Using shared browser instance for ${portfolioName}...`);
        }

        const page = await browser.newPage();

        // Navigate
        await page.goto('https://portal.skandia.com.co/om.rentabilidades.pl/oldmutual', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        // Wait for table
        await page.waitForSelector('div[id^="numberOfRow"]', { timeout: 10000 });

        // Find the row with the portfolio name
        const rowId = await page.evaluate((name) => {
            const rows = document.querySelectorAll('div[id^="numberOfRow"]');
            for (const row of rows) {
                const rowName = row.querySelector('.nombreLargo')?.textContent?.trim();
                if (rowName === name) {
                    return row.id;
                }
            }
            return null;
        }, portfolioName);

        if (!rowId) {
            console.warn(`[PDF Scraper] Portfolio "${portfolioName}" not found.`);
            return { pdfBase64: null, pdfUrl: null };
        }

        console.log(`[PDF Scraper] Found row ${rowId}. Expanding...`);
        await page.click(`#${rowId}`);

        // Hardcoded period as requested by user
        const period = '1';
        console.log(`[PDF Scraper] Using hardcoded period: ${period}`);

        // Extract hidden values to construct the URL manually
        // This bypasses the need to click the button and handle window.open
        const params = await page.evaluate(() => {
            const origin = (document.querySelector('#origin') as HTMLInputElement)?.value;
            const idPortfolio = (document.querySelector('#idPortfolio') as HTMLInputElement)?.value;
            const idProduct = (document.querySelector('#idProduct') as HTMLInputElement)?.value;
            return { origin, idPortfolio, idProduct };
        });

        console.log('[PDF Scraper] Extracted params:', params);

        if (!params.origin || !params.idPortfolio || !params.idProduct) {
            console.error('[PDF Scraper] Missing required parameters for PDF URL construction.');
            return { pdfBase64: null, pdfUrl: null };
        }

        // Construct the Security.aspx URL
        // https://portal.skandia.com.co/SkCo.Communications.Web/SkCo/Communications/Web/Security.aspx?Origen=...
        const urlObj = new URL('https://portal.skandia.com.co/SkCo.Communications.Web/SkCo/Communications/Web/Security.aspx');
        urlObj.searchParams.set('Origen', params.origin);
        urlObj.searchParams.set('Period', period);
        urlObj.searchParams.set('IdVariable', params.idPortfolio);
        urlObj.searchParams.set('Product', params.idProduct);
        const securityUrl = urlObj.toString();

        console.log(`[PDF Scraper] Navigating to Security URL: ${securityUrl}`);

        // Get cookies from the browser session to authenticate the Node.js fetch
        const cookies = await page.cookies();
        const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

        console.log(`[PDF Scraper] Fetching PDF via Node.js with ${cookies.length} cookies...`);

        // Use Node.js native fetch (available in Next.js/Node 18+)
        // SENTINEL: Added AbortSignal.timeout to prevent indefinite hang and potential DoS
        const response = await fetch(securityUrl, {
            headers: {
                'Cookie': cookieHeader,
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            redirect: 'follow',
            signal: AbortSignal.timeout(30000)
        });

        if (!response.ok) {
            console.error(`[PDF Scraper] Fetch failed with status ${response.status} ${response.statusText}`);
            return { pdfBase64: null, pdfUrl: null };
        }

        // Check content type
        const contentType = response.headers.get('content-type');
        console.log(`[PDF Scraper] Response Content-Type: ${contentType}`);

        // The response might be the PDF or the redirect page if 'follow' didn't work as expected (though it should).
        // If it's a PDF, content-type should be application/pdf or application/octet-stream.

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Basic validation: Check PDF signature (%PDF)
        if (buffer.lastIndexOf('%PDF') === -1 && !contentType?.includes('pdf')) {
            console.warn('[PDF Scraper] Response does not look like a PDF (missing signature or wrong mime).');
            // 🛡️ SENTINEL: Do not log raw response buffers to prevent sensitive data disclosure
            return { pdfBase64: null, pdfUrl: null };
        }

        console.log('[PDF Scraper] PDF downloaded successfully.');

        return {
            pdfBase64: buffer.toString('base64'),
            pdfUrl: securityUrl // We use the security URL as the link
        };

    } catch (error) {
        console.error('[PDF Scraper] Error:', error);
        return { pdfBase64: null, pdfUrl: null };
    } finally {
        if (ownBrowser && browser) await browser.close();
    }
}
