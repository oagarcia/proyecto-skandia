import puppeteer, { Browser, Target } from 'puppeteer';

export async function getPortfolioPdf(portfolioName: string): Promise<{ pdfBase64: string | null, pdfUrl: string | null }> {
    let browser: Browser | undefined;
    try {
        console.log(`[PDF Scraper] Launching browser for ${portfolioName}...`);
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
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

        // Wait for dropdown to be visible
        // The dropdown ID is unique, so waiting for it is fine.
        await page.waitForSelector('#customDate', { visible: true, timeout: 10000 });

        // Give a small pause for options to populate via JS
        await new Promise(r => setTimeout(r, 1000));

        // Select first option (Latest available month)
        const firstOptionValue = await page.evaluate(() => {
            const select = document.querySelector('#customDate') as HTMLSelectElement;
            return select?.options[0]?.value;
        });

        if (firstOptionValue) {
            console.log(`[PDF Scraper] Selecting first option (value: ${firstOptionValue})...`);
            await page.select('#customDate', firstOptionValue);
        } else {
            console.warn('[PDF Scraper] No options found in dropdown. Trying default "0".');
            await page.select('#customDate', '0');
        }

        // Wait for the PDF button to be interactive. 
        // It might be animating in.
        await page.waitForSelector('.PDFButton', { visible: true, timeout: 5000 });
        await new Promise(r => setTimeout(r, 500)); // Extra safety pause

        // Setup listener for new target (the PDF tab)
        const newTargetPromise = new Promise<Target>(resolve => {
            browser!.once('targetcreated', (target: Target) => resolve(target));
        });

        console.log('[PDF Scraper] Clicking PDF button...');
        await page.click('.PDFButton');

        const target = await newTargetPromise;
        const newPage = await target.page();

        if (!newPage) {
            console.warn('[PDF Scraper] New target created but no page found (maybe download?).');
            return { pdfBase64: null, pdfUrl: null };
        }

        const pdfUrl = newPage.url();
        console.log(`[PDF Scraper] PDF URL found: ${pdfUrl}`);

        // Fetch the PDF content
        const response = await fetch(pdfUrl);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        return {
            pdfBase64: buffer.toString('base64'),
            pdfUrl: pdfUrl
        };

    } catch (error) {
        console.error('[PDF Scraper] Error:', error);
        return { pdfBase64: null, pdfUrl: null };
    } finally {
        if (browser) await browser.close();
    }
}
