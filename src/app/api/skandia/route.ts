import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { isValidDate } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limit';

export async function GET(request: Request) {
    // Rate Limiting
    // Prefer x-real-ip to mitigate trivial IP spoofing bypass via x-forwarded-for
    const realIp = request.headers.get('x-real-ip');
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = realIp || (forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown');
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
        
        let options: any = {};
        
        const isDev = process.env.NODE_ENV === 'development';
        
        if (isDev) {
            // Local Mac environment
            options = {
                args: [
                    '--no-sandbox', 
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu'
                ],
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                headless: true,
            };
        } else {
            // Production environments (Vercel, Render.com)
            options = {
                args: chromium.args,
                executablePath: await chromium.executablePath(
                    'https://github.com/Sparticuz/chromium/releases/download/v143.0.4/chromium-v143.0.4-pack.x64.tar'
                ),
                headless: true,
                ignoreHTTPSErrors: true,
            };
        }

        browser = await puppeteer.launch(options);
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

        await page.waitForSelector('#tableData1', { timeout: 10000 });

        const portfolios = await page.evaluate(() => {
            const results: any[] = [];

            const categories = [
                { id: 'tableData1', name: 'Portafolios Abiertos' },
                { id: 'tableData2', name: 'Portafolios a la Medida' },
                { id: 'tableData3', name: 'Portafolios Especiales' }
            ];

            categories.forEach(cat => {
                const container = document.getElementById(cat.id);
                if (!container) return;

                const rows = container.querySelectorAll('div[id^="numberOfRow"]');

                rows.forEach(row => {
                    const name = row.querySelector('.nombreLargo')?.textContent?.trim() || '';
                    const type = row.querySelector('.tipoInversion')?.textContent?.trim() || '';
                    const valueStr = row.querySelector('.valorFondo')?.textContent?.trim() || '0';

                    // Risk
                    const riskImg = row.querySelector('.perfilRiesgo img')?.getAttribute('src') || '';
                    let risk = 'Unknown';
                    if (riskImg.includes('pRiesgo1')) risk = 'Conservador';
                    if (riskImg.includes('pRiesgo2')) risk = 'Moderado';
                    if (riskImg.includes('pRiesgo3')) risk = 'Agresivo';

                    // Returns (1 Day, 30 Days, 180 Days, 365 Days)
                    const dayDivs = row.querySelectorAll('.days');
                    const returns = {
                        daily: dayDivs[0]?.textContent?.trim() || '0%',
                        monthly: dayDivs[1]?.textContent?.trim() || '0%',
                        sixMonths: dayDivs[2]?.textContent?.trim() || '0%',
                        yearly: dayDivs[3]?.textContent?.trim() || '0%',
                    };

                    results.push({
                        id: row.id,
                        category: cat.name, // Add category field
                        name,
                        type,
                        value: valueStr,
                        risk,
                        returns
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
        
        // Temporarily surfacing the error.message to debug Vercel runtime failures
        return NextResponse.json({ 
            success: false, 
            error: error?.message || 'Failed to scrape data',
            stack: error?.stack
        }, { status: 500 });
    }
}
