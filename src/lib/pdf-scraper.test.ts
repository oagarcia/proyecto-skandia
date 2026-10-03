// @spec src/specs/lib/pdf-scraper.spec.md
// fetch se stubbea con vi.stubGlobal: los tests no tocan el portal real.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./pdf-parser', () => ({
    pdfHasHoldingsData: vi.fn(),
}));

import { pdfHasHoldingsData } from './pdf-parser';
import {
    getPortfolioPdf,
    fetchPortfolioPdf,
    parsePortfolioCatalog,
    findPortfolioPdfParams,
    type PortfolioCatalog,
} from './pdf-scraper';

const PORTAL = 'https://portal.skandia.com.co';
const CATALOG_URL = `${PORTAL}/om.rentabilidades.pl/oldmutual`;
const SECURITY_PATH = '/SkCo.Communications.Web/SkCo/Communications/Web/Security.aspx';
const OPEN_FILE_PATH = '/SkCo.Communications.Web/SkCo/Communications/Web/OpenFile.aspx';
const VIEW_PDF_PATH = '/SkCo.Communications.Web/SkCo/Communications/Web/ViewPDF.aspx';

const CATALOG: PortfolioCatalog = [
    {
        CategoryName: 'Skandia Pensiones y Cesantías S.A.',
        Products: [
            {
                Id: 'IND',
                Origen: '6',
                ProductName: 'Portafolios Abiertos',
                Portfolios: [
                    { Id: 'OMACCG', LongName: 'FPV Acciones Global' },
                    { Id: 'OMBRKT', LongName: 'FPV Corchetes [beta]' },
                ],
            },
            {
                Id: 'STL',
                Origen: '',
                ProductName: 'Sin origen',
                Portfolios: [{ Id: 'NOORIG', LongName: 'FPV Sin Origen' }],
            },
        ],
    },
    {
        CategoryName: 'Skandia Fiduciaria',
        Products: [
            {
                Id: 'FCO',
                Origen: '7',
                ProductName: 'FIC Efectivo',
                Portfolios: [{ Id: 'FIDU01', LongName: 'FIC Solo Fiduciaria' }],
            },
        ],
    },
];

const catalogHtml = (catalog: unknown = CATALOG) =>
    `<html><script>var x = 1;\n        data = ${JSON.stringify(catalog)};\n        render(data);</script></html>`;

const PDF_BYTES = Buffer.from('%PDF-1.4 fake pdf body');

type Call = { url: string; init: RequestInit };

/**
 * Simulates the portal: catalog page, then Security.aspx → 302 (Set-Cookie) → OpenFile.aspx → 302 → ViewPDF.aspx.
 * OpenFile.aspx only redirects to the PDF when the session cookie is sent back, like the real portal.
 */
function portalFetch(overrides: { pdfForPeriod?: (period: string) => Response | null } = {}) {
    const calls: Call[] = [];
    const fn = vi.fn(async (input: string | URL, init: RequestInit = {}) => {
        const url = new URL(String(input));
        calls.push({ url: url.toString(), init });
        const cookie = new Headers(init.headers).get('Cookie') ?? '';

        if (url.toString() === CATALOG_URL) {
            return new Response(catalogHtml(), { status: 200 });
        }
        if (url.pathname === SECURITY_PATH) {
            const period = url.searchParams.get('Period') ?? '';
            const headers = new Headers({ Location: `${OPEN_FILE_PATH}?p=${period}` });
            headers.append('Set-Cookie', 'ASP.NET_SessionId=abc123; path=/; HttpOnly');
            headers.append('Set-Cookie', 'Manual_F5=xyz; path=/; Secure');
            return new Response(null, { status: 302, headers });
        }
        if (url.pathname === OPEN_FILE_PATH) {
            if (!cookie.includes('ASP.NET_SessionId=abc123') || !cookie.includes('Manual_F5=xyz')) {
                return new Response('<!DOCTYPE html><title>OpenFile</title>', { status: 200 });
            }
            return new Response(null, {
                status: 302,
                headers: { Location: `ViewPDF.aspx?file=x&p=${url.searchParams.get('p')}` },
            });
        }
        if (url.pathname === VIEW_PDF_PATH) {
            const period = url.searchParams.get('p') ?? '';
            const custom = overrides.pdfForPeriod?.(period);
            if (custom) return custom;
            return new Response(PDF_BYTES, { status: 200, headers: { 'Content-Type': 'text/html' } });
        }
        return new Response('not found', { status: 404 });
    });
    return { fn, calls };
}

beforeEach(() => {
    vi.mocked(pdfHasHoldingsData).mockResolvedValue(true);
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
});

describe('getPortfolioPdf - input validation', () => {
    it('should return null result for empty portfolio name', async () => {
        const { fn } = portalFetch();
        vi.stubGlobal('fetch', fn);
        const result = await getPortfolioPdf('');
        expect(result).toEqual({ pdfBase64: null, pdfUrl: null });
        expect(fn).not.toHaveBeenCalled();
    });

    it('should return null result for portfolio name over 200 characters', async () => {
        const { fn } = portalFetch();
        vi.stubGlobal('fetch', fn);
        const result = await getPortfolioPdf('A'.repeat(201));
        expect(result).toEqual({ pdfBase64: null, pdfUrl: null });
        expect(fn).not.toHaveBeenCalled();
    });

    it('should never throw an exception regardless of input', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
        await expect(getPortfolioPdf('')).resolves.toEqual({ pdfBase64: null, pdfUrl: null });
        await expect(getPortfolioPdf('A'.repeat(201))).resolves.toEqual({ pdfBase64: null, pdfUrl: null });
        await expect(getPortfolioPdf('FPV Acciones Global')).resolves.toEqual({ pdfBase64: null, pdfUrl: null });
    });
});

describe('parsePortfolioCatalog', () => {
    it('should parse the embedded data array', () => {
        expect(parsePortfolioCatalog(catalogHtml())).toEqual(CATALOG);
    });

    it('should ignore brackets inside JSON strings', () => {
        const catalog = parsePortfolioCatalog(catalogHtml());
        expect(catalog?.[0].Products[0].Portfolios?.[1].LongName).toBe('FPV Corchetes [beta]');
        const escaped = [{ CategoryName: 'a \\"]" b', Products: [] }];
        expect(parsePortfolioCatalog(catalogHtml(escaped))).toEqual(escaped);
    });

    it('should return null for missing marker, unterminated array or invalid JSON', () => {
        expect(parsePortfolioCatalog('<html>no catalog here</html>')).toBeNull();
        expect(parsePortfolioCatalog('<script>data = [{"a": 1}, </script>')).toBeNull();
        expect(parsePortfolioCatalog('<script>data = [{a: 1}];</script>')).toBeNull();
    });
});

describe('findPortfolioPdfParams', () => {
    it('should map product and portfolio ids to PDF params', () => {
        expect(findPortfolioPdfParams(CATALOG, 'FPV Acciones Global')).toEqual({
            origin: '6',
            idPortfolio: 'OMACCG',
            idProduct: 'IND',
        });
    });

    it('should only search the first category', () => {
        expect(findPortfolioPdfParams(CATALOG, 'FIC Solo Fiduciaria')).toBeNull();
    });

    it('should return null for unknown portfolio or empty params', () => {
        expect(findPortfolioPdfParams(CATALOG, 'FPV No Existe')).toBeNull();
        expect(findPortfolioPdfParams(CATALOG, 'FPV Sin Origen')).toBeNull();
        expect(findPortfolioPdfParams([], 'FPV Acciones Global')).toBeNull();
    });
});

describe('fetchPortfolioPdf', () => {
    it('should return null when the catalog page fails', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('error', { status: 503 })));
        expect(await fetchPortfolioPdf('FPV Acciones Global')).toBeNull();

        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html></html>', { status: 200 })));
        expect(await fetchPortfolioPdf('FPV Acciones Global')).toBeNull();
    });

    it('should forward session cookies across redirects', async () => {
        const { fn, calls } = portalFetch();
        vi.stubGlobal('fetch', fn);

        const result = await fetchPortfolioPdf('FPV Acciones Global');

        expect(result?.buffer.equals(PDF_BYTES)).toBe(true);
        const security = new URL(result!.url);
        expect(security.origin + security.pathname).toBe(PORTAL + SECURITY_PATH);
        expect(Object.fromEntries(security.searchParams)).toEqual({
            Origen: '6',
            Period: '0',
            IdVariable: 'OMACCG',
            Product: 'IND',
        });
        const openFileCall = calls.find(c => c.url.includes('OpenFile.aspx'));
        expect(new Headers(openFileCall?.init.headers).get('Cookie')).toBe('ASP.NET_SessionId=abc123; Manual_F5=xyz');
        expect(calls.every(c => c.init.redirect === 'manual')).toBe(true);
    });

    it('should not follow redirects to other hosts', async () => {
        const fn = vi.fn(async (input: string | URL) => {
            const url = String(input);
            if (url === CATALOG_URL) return new Response(catalogHtml(), { status: 200 });
            if (url.includes('Security.aspx')) {
                return new Response(null, { status: 302, headers: { Location: 'https://evil.example.com/steal' } });
            }
            return new Response(PDF_BYTES, { status: 200 });
        });
        vi.stubGlobal('fetch', fn);

        expect(await fetchPortfolioPdf('FPV Acciones Global')).toBeNull();
        expect(fn.mock.calls.some(([u]) => String(u).includes('evil.example.com'))).toBe(false);
    });

    it('should stop after 5 redirects', async () => {
        const fn = vi.fn(async (input: string | URL) => {
            const url = String(input);
            if (url === CATALOG_URL) return new Response(catalogHtml(), { status: 200 });
            return new Response(null, { status: 302, headers: { Location: `${SECURITY_PATH}?loop=1` } });
        });
        vi.stubGlobal('fetch', fn);

        expect(await fetchPortfolioPdf('FPV Acciones Global')).toBeNull();
        const securityCalls = fn.mock.calls.filter(([u]) => String(u).includes('Security.aspx'));
        // 2 periods × (1 initial request + 5 redirects)
        expect(securityCalls.length).toBe(12);
    });

    it('should pass an abort signal to every request', async () => {
        const { fn, calls } = portalFetch();
        vi.stubGlobal('fetch', fn);

        await fetchPortfolioPdf('FPV Acciones Global');

        expect(calls.length).toBeGreaterThan(0);
        expect(calls.every(c => c.init.signal instanceof AbortSignal)).toBe(true);
    });

    it('should reject responses without a PDF signature', async () => {
        const { fn } = portalFetch({
            pdfForPeriod: () => new Response('<html>not a pdf</html>', { status: 200, headers: { 'Content-Type': 'application/pdf' } }),
        });
        vi.stubGlobal('fetch', fn);

        expect(await fetchPortfolioPdf('FPV Acciones Global')).toBeNull();
    });

    it('should reject PDFs larger than 20 MB', async () => {
        const huge = Buffer.alloc(20 * 1024 * 1024 + 1);
        huge.write('%PDF-1.4');
        const { fn } = portalFetch({ pdfForPeriod: () => new Response(huge, { status: 200 }) });
        vi.stubGlobal('fetch', fn);

        expect(await fetchPortfolioPdf('FPV Acciones Global')).toBeNull();
    });

    it('should use period 0 when it has holdings', async () => {
        const { fn, calls } = portalFetch();
        vi.stubGlobal('fetch', fn);

        const result = await fetchPortfolioPdf('FPV Acciones Global');

        expect(new URL(result!.url).searchParams.get('Period')).toBe('0');
        expect(calls.some(c => c.url.includes('Period=1'))).toBe(false);
    });

    it('should fall back to period 1 when period 0 has no holdings or fails', async () => {
        vi.mocked(pdfHasHoldingsData).mockResolvedValueOnce(false);
        const { fn } = portalFetch();
        vi.stubGlobal('fetch', fn);
        const noHoldings = await fetchPortfolioPdf('FPV Acciones Global');
        expect(new URL(noHoldings!.url).searchParams.get('Period')).toBe('1');

        const failing = portalFetch({
            pdfForPeriod: period => (period === '0' ? new Response('down', { status: 500 }) : null),
        });
        vi.stubGlobal('fetch', failing.fn);
        const failed = await fetchPortfolioPdf('FPV Acciones Global');
        expect(new URL(failed!.url).searchParams.get('Period')).toBe('1');
    });
});

describe('getPortfolioPdf', () => {
    it('should return base64 and Security.aspx URL on success', async () => {
        const { fn } = portalFetch();
        vi.stubGlobal('fetch', fn);

        const result = await getPortfolioPdf('FPV Acciones Global');

        expect(result.pdfBase64).toBe(PDF_BYTES.toString('base64'));
        expect(result.pdfUrl).toContain(SECURITY_PATH);
    });
});
