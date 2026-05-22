import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function GET(request: Request) {
    // Rate Limiting
    const ip = getClientIp(request);
    if (!checkRateLimit(ip, 60, 60 * 1000)) {
        return NextResponse.json({ success: false, error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const period = searchParams.get('period') || 'P4';

    // Validation
    if (!id || typeof id !== 'string' || id.length > 50 || !/^[A-Z0-9_]+$/.test(id)) {
        return NextResponse.json({ success: false, error: 'Invalid or missing portfolio ID' }, { status: 400 });
    }

    const validPeriods = ['P1', 'P2', 'P3', 'P4'];
    const customPeriodRegex = /^P0_\d{2}-\d{2}-\d{4}_\d{2}-\d{2}-\d{4}$/;
    if (!validPeriods.includes(period) && !customPeriodRegex.test(period)) {
        return NextResponse.json({ success: false, error: 'Invalid period parameter. Use P1, P2, P3, P4, or P0_DD-MM-YYYY_DD-MM-YYYY.' }, { status: 400 });
    }

    try {
        console.log(`[Series API] Fetching series for portfolio=${id}, period=${period}`);
        const url = `https://portal.skandia.com.co/OM.Rentabilidades.PL/Skandia/GetSeries/${id}/${period}/0`;
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            signal: AbortSignal.timeout(15000) // 15s timeout
        });

        if (!response.ok) {
            console.error(`[Series API] External request failed with status ${response.status}`);
            return NextResponse.json({ success: false, error: 'Failed to fetch series data from external server.' }, { status: response.status });
        }

        const data = await response.json();
        
        // Return structured data
        return NextResponse.json({
            success: true,
            data: {
                var: data.Var,
                label: data.Label,
                series: data.Series || []
            }
        });

    } catch (error) {
        console.error('[Series API] Error:', error);
        return NextResponse.json({ 
            success: false, 
            error: 'An internal error occurred while fetching series data.' 
        }, { status: 500 });
    }
}
