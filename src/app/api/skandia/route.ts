import { NextResponse } from 'next/server';
import { getBrowser } from '@/lib/browser';
import { isValidDate } from '@/lib/validation';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function GET(request: Request) {
    // Rate Limiting
    const ip = getClientIp(request);
    // Allow slightly more generous limit for the main data fetch, but still protect it
    if (!checkRateLimit(ip, 20, 60 * 1000)) {
        return NextResponse.json({ success: false, error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const now = new Date();
    // Default to a reasonable range if needed, but the portal seems to load data by default or we just need to trigger calculation.
    // The debug script showed data loaded even without explicit date setting if we just wait, but let's be safe.
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    let from = searchParams.get('from');
    let to = searchParams.get('to');

    if (from && !isValidDate(from)) {
        return NextResponse.json({ success: false, error: 'Invalid "from" date format. Use YYYY-MM-DD.' }, { status: 400 });
    }
    if (to && !isValidDate(to)) {
        return NextResponse.json({ success: false, error: 'Invalid "to" date format. Use YYYY-MM-DD.' }, { status: 400 });
    }

    if (from && to && from > to) {
        return NextResponse.json({ success: false, error: '"from" date cannot be after "to" date.' }, { status: 400 });
    }

    from = from || firstDay;
    to = to || lastDay;

    let browser;

    try {
        console.log('Launching browser...');
        
        browser = await getBrowser();
        console.log('Browser launched');
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });

        console.log('Navigating to page...');
        await page.goto('https://portal.skandia.com.co/om.rentabilidades.pl/oldmutual', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        console.log('Page loaded');

        // 1. Click "Variación Unidad"
        try {
            console.log('Clicking "Variación Unidad"...');
            // We use the ID found in the HTML: #variacionCb
            await page.waitForSelector('#variacionCb', { timeout: 5000 });
            await page.click('#variacionCb');
            // Wait for the change to trigger (it has an onclick handler)
            await page.waitForNetworkIdle({ idleTime: 500, timeout: 5000 }).catch(() => { });
        } catch (e) {
            console.warn('Could not click "Variación Unidad" radio button:', e);
        }

        // 2. Input dates and Calculate
        await page.evaluate((f, t) => {
            // @ts-ignore
            document.getElementById('datepickerFrom').value = f;
            // @ts-ignore
            document.getElementById('datepickerTo').value = t;
        }, from, to);

        try {
            await page.waitForSelector('.calcularButton', { timeout: 5000 });
            await page.click('.calcularButton');
            // Wait for data reload
            await page.waitForNetworkIdle({ idleTime: 500, timeout: 10000 }).catch(() => { });
        } catch (e) {
            console.log('Calculate button not found or click failed', e);
        }

        // 3. Scrape data by Category
        // Categories are in containers:
        // #tableData1 -> Portafolios Abiertos
        // #tableData2 -> Portafolios a la Medida
        // #tableData3 -> Portafolios Especiales

        await page.waitForSelector('div[id^="numberOfRow"]', { timeout: 10000 });

        const portfolios = await page.evaluate(() => {
            const win = window as any;
            if (typeof win.data === 'undefined') return [];
            const results: any[] = [];
            const cat = win.data['0']; // Only 'Skandia Pensiones y Cesantías S.A.' is displayed in the tables
            if (!cat || !cat.Products) return [];

            const formatReturn = (val: any) => {
                if (!val) return '0%';
                const str = String(val).trim();
                if (str === '' || str === '%') return '0%';
                if (str.endsWith('%')) return str;
                return str + '%';
            };

            cat.Products.forEach((p: any) => {
                if (!p.Portfolios) return;
                p.Portfolios.forEach((port: any) => {
                    let risk = 'Unknown';
                    if (port.ProfileRisk === '1') risk = 'Conservador';
                    if (port.ProfileRisk === '2') risk = 'Moderado';
                    if (port.ProfileRisk === '3') risk = 'Agresivo';

                    results.push({
                        id: port.Id, // Real portfolio sigla (e.g. OMACTE)
                        category: p.ProductName, // e.g. "Portafolios Abiertos"
                        name: port.LongName || '',
                        type: port.Clasification || 'Unknown',
                        value: port.FundValueForExcel || '0',
                        risk,
                        returns: {
                            daily: formatReturn(port.UnitValueDay1),
                            monthly: formatReturn(port.UnitValueDay30),
                            sixMonths: formatReturn(port.UnitValueDay180),
                            yearly: formatReturn(port.UnitValueDay365)
                        }
                    });
                });
            });

            return results;
        });

        await browser.close();
        return NextResponse.json({ success: true, data: portfolios });

    } catch (error: any) {
        console.error('Scraping error:', error);
        if (browser) await browser.close();
        
        // SENTINEL: Do not leak detailed error messages or stack traces
        return NextResponse.json({ 
            success: false, 
            error: 'Failed to scrape data. An internal error occurred.'
        }, { status: 500 });
    }
}
