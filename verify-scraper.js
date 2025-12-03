
const puppeteer = require('puppeteer');

async function getPortfolioPdf(portfolioName) {
    let browser;
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
        await page.waitForSelector('#customDate', { visible: true, timeout: 10000 });

        // Wait for options to populate
        await page.waitForFunction(() => {
            const select = document.querySelector('#customDate');
            return select && select.options.length > 0;
        }, { timeout: 5000 });

        // Select first option (Latest available month)
        const firstOptionValue = await page.evaluate(() => {
            const select = document.querySelector('#customDate');
            return select?.options[0]?.value;
        });

        if (firstOptionValue) {
            console.log(`[PDF Scraper] Selecting first option (value: ${firstOptionValue})...`);
            await page.select('#customDate', firstOptionValue);
        } else {
            console.warn('[PDF Scraper] No options found in dropdown even after wait. Trying default "0".');
            await page.select('#customDate', '0');
        }

        // Extract hidden values to construct the URL manually
        const params = await page.evaluate(() => {
            const origin = document.querySelector('#origin')?.value;
            const idPortfolio = document.querySelector('#idPortfolio')?.value;
            const idProduct = document.querySelector('#idProduct')?.value;
            const period = document.querySelector('#customDate')?.value;
            return { origin, idPortfolio, idProduct, period };
        });

        console.log('[PDF Scraper] Extracted params:', params);

        if (!params.origin || !params.idPortfolio || !params.idProduct || !params.period) {
            console.error('[PDF Scraper] Missing required parameters for PDF URL construction.');
            return { pdfBase64: null, pdfUrl: null };
        }

        const securityUrl = `https://portal.skandia.com.co/SkCo.Communications.Web/SkCo/Communications/Web/Security.aspx?Origen=${params.origin}&Period=${params.period}&IdVariable=${params.idPortfolio}&Product=${params.idProduct}`;

        console.log(`[PDF Scraper] Navigating to Security URL: ${securityUrl}`);

        console.log(`[PDF Scraper] Fetching PDF data via browser context...`);

        const pdfDataUrl = await page.evaluate(async (url) => {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Fetch failed with status ${response.status}`);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        }, securityUrl);

        if (!pdfDataUrl || !pdfDataUrl.startsWith('data:application/pdf')) {
            console.error('[PDF Scraper] Failed to fetch PDF data or invalid format.');
            return { pdfBase64: null, pdfUrl: null };
        }

        console.log('[PDF Scraper] PDF data fetched successfully.');

        const base64 = pdfDataUrl.split(',')[1];

        return {
            pdfBase64: base64,
            pdfUrl: securityUrl
        };

    } catch (error) {
        console.error('[PDF Scraper] Error:', error);
        return { pdfBase64: null, pdfUrl: null };
    } finally {
        if (browser) await browser.close();
    }
}

async function test() {
    console.log('Testing PDF Scraper...');
    const portfolioName = 'FPV Acciones Global';

    try {
        const result = await getPortfolioPdf(portfolioName);

        if (result.pdfUrl && result.pdfBase64) {
            console.log('SUCCESS: PDF fetched successfully!');
            console.log('URL:', result.pdfUrl);
            console.log('Base64 Length:', result.pdfBase64.length);
        } else {
            console.error('FAILURE: PDF not fetched (null result).');
        }
    } catch (error) {
        console.error('FAILURE: Error during fetch:', error);
    }
}

test();
