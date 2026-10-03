import { NextResponse } from 'next/server';
import { fetchPortfolioPdf } from '@/lib/pdf-scraper';
import { getPdfFileName } from '@/lib/portfolio-pdf-link';
import { validatePortfolioName } from '@/lib/validation';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function GET(request: Request) {
    try {
        // 🛡️ SENTINEL: Rate limit — every request downloads up to two PDFs from the Skandia portal.
        const ip = getClientIp(request);
        if (!checkRateLimit(ip, 20, 60 * 1000)) {
            return NextResponse.json({ success: false, error: 'Too many requests. Please try again later.' }, { status: 429 });
        }

        // 🛡️ SENTINEL: Allow-list the name before it reaches the portal lookup.
        const name = new URL(request.url).searchParams.get('name');
        const validation = validatePortfolioName(name);
        if (!validation.valid || !name) {
            return NextResponse.json({ success: false, error: validation.error ?? 'Invalid name' }, { status: 400 });
        }

        const result = await fetchPortfolioPdf(name);
        if (!result) {
            return NextResponse.json({ success: false, error: 'PDF not available for this portfolio.' }, { status: 404 });
        }

        return new NextResponse(new Uint8Array(result.buffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                // 🛡️ SENTINEL: getPdfFileName strips everything but [a-zA-Z0-9_] (no header injection).
                'Content-Disposition': `inline; filename="${getPdfFileName(name)}"`,
                // 🛡️ SENTINEL: nosniff keeps the browser from rendering the body as anything but a PDF.
                'X-Content-Type-Options': 'nosniff',
                'Cache-Control': 'private, max-age=3600',
            },
        });
    } catch (error) {
        console.error('[Portfolio PDF API] Error:', error);
        return NextResponse.json({ success: false, error: 'An internal error occurred while fetching the PDF.' }, { status: 500 });
    }
}
