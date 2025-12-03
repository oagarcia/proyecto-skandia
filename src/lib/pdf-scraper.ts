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
        await page.waitForSelector('#customDate', { visible: true, timeout: 10000 });

        // Wait for options to populate
        await page.waitForFunction(() => {
            const select = document.querySelector('#customDate') as HTMLSelectElement;
            return select && select.options.length > 0;
        }, { timeout: 5000 });

        // Select first valid option (Latest available month, skipping empty placeholder)
        const firstOptionValue = await page.evaluate(() => {
            const select = document.querySelector('#customDate') as HTMLSelectElement;
            if (!select) return null;

            // Iterate through options to find the first one with a non-empty value
            for (const option of Array.from(select.options)) {
                if (option.value && option.value.trim() !== "") {
                    return option.value;
                }
            }
            return null;
        });

        if (firstOptionValue) {
            console.log(`[PDF Scraper] Selecting first valid option (value: ${firstOptionValue})...`);
            await page.select('#customDate', firstOptionValue);
        } else {
            console.warn('[PDF Scraper] No valid options found in dropdown. Trying default "0".');
            await page.select('#customDate', '0');
        }

        // Extract hidden values to construct the URL manually
        // This bypasses the need to click the button and handle window.open
        const params = await page.evaluate(() => {
            const origin = (document.querySelector('#origin') as HTMLInputElement)?.value;
            const idPortfolio = (document.querySelector('#idPortfolio') as HTMLInputElement)?.value;
            const idProduct = (document.querySelector('#idProduct') as HTMLInputElement)?.value;
            const period = (document.querySelector('#customDate') as HTMLSelectElement)?.value;
            return { origin, idPortfolio, idProduct, period };
        });

        console.log('[PDF Scraper] Extracted params:', params);

        if (!params.origin || !params.idPortfolio || !params.idProduct || !params.period) {
            console.error('[PDF Scraper] Missing required parameters for PDF URL construction.');
            return { pdfBase64: null, pdfUrl: null };
        }

        // Construct the Security.aspx URL
        // https://portal.skandia.com.co/SkCo.Communications.Web/SkCo/Communications/Web/Security.aspx?Origen=...
        const securityUrl = `https://portal.skandia.com.co/SkCo.Communications.Web/SkCo/Communications/Web/Security.aspx?Origen=${params.origin}&Period=${params.period}&IdVariable=${params.idPortfolio}&Product=${params.idProduct}`;

        console.log(`[PDF Scraper] Navigating to Security URL: ${securityUrl}`);

        // Get cookies from the browser session to authenticate the Node.js fetch
        const cookies = await page.cookies();
        const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

        console.log(`[PDF Scraper] Fetching PDF via Node.js with ${cookies.length} cookies...`);

        // Use Node.js native fetch (available in Next.js/Node 18+)
        const response = await fetch(securityUrl, {
            headers: {
                'Cookie': cookieHeader,
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            redirect: 'follow'
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
            // Log a bit of the content to debug
            console.log('[PDF Scraper] Response preview:', buffer.slice(0, 100).toString());
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
        if (browser) await browser.close();
    }
}
