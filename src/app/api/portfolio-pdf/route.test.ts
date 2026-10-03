// @spec src/specs/api/portfolio-pdf-route.spec.md
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/pdf-scraper', () => ({
    fetchPortfolioPdf: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
    checkRateLimit: vi.fn(),
    getClientIp: vi.fn(() => '127.0.0.1'),
}));

import { GET } from './route';
import { fetchPortfolioPdf } from '@/lib/pdf-scraper';
import { checkRateLimit } from '@/lib/rate-limit';

const request = (name?: string) => {
    const url = new URL('http://localhost/api/portfolio-pdf');
    if (name !== undefined) url.searchParams.set('name', name);
    return new Request(url);
};

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockReturnValue(true);
});

describe('GET /api/portfolio-pdf', () => {
    it('should return 429 when rate limited', async () => {
        vi.mocked(checkRateLimit).mockReturnValue(false);
        const res = await GET(request('FPV Acciones Global'));
        expect(res.status).toBe(429);
        expect(checkRateLimit).toHaveBeenCalledWith('127.0.0.1', 20, 60 * 1000);
        expect(fetchPortfolioPdf).not.toHaveBeenCalled();
    });

    it('should return 400 for an invalid name', async () => {
        for (const name of [undefined, '', '<script>alert(1)</script>', 'A'.repeat(101)]) {
            const res = await GET(request(name));
            expect(res.status).toBe(400);
            expect((await res.json()).success).toBe(false);
        }
        expect(fetchPortfolioPdf).not.toHaveBeenCalled();
    });

    it('should return 404 when the PDF is not available', async () => {
        vi.mocked(fetchPortfolioPdf).mockResolvedValue(null);
        const res = await GET(request('FPV Acciones Global'));
        expect(res.status).toBe(404);
        expect(await res.json()).toEqual({ success: false, error: 'PDF not available for this portfolio.' });
    });

    it('should return the PDF inline with safe headers', async () => {
        const buffer = Buffer.from('%PDF-1.4 body');
        vi.mocked(fetchPortfolioPdf).mockResolvedValue({ buffer, url: 'https://portal.skandia.com.co/x' });

        const res = await GET(request('FPV Acciones Global'));

        expect(fetchPortfolioPdf).toHaveBeenCalledWith('FPV Acciones Global');
        expect(res.status).toBe(200);
        expect(res.headers.get('Content-Type')).toBe('application/pdf');
        expect(res.headers.get('Content-Disposition')).toBe('inline; filename="Ficha_Tecnica_FPV_Acciones_Global.pdf"');
        expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
        expect(res.headers.get('Cache-Control')).toBe('private, max-age=3600');
        expect(Buffer.from(await res.arrayBuffer()).equals(buffer)).toBe(true);
    });

    it('should return a generic 500 on unexpected errors', async () => {
        vi.mocked(fetchPortfolioPdf).mockRejectedValue(new Error('boom: internal detail'));
        const res = await GET(request('FPV Acciones Global'));
        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body.success).toBe(false);
        expect(body.error).not.toContain('internal detail');
    });
});
