
const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const url = 'https://finance.yahoo.com/quote/CIB/';
    console.log(`Navigating to ${url}...`);

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();

    // Set a real user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 1024 });

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Wait a bit for dynamic content
        await new Promise(r => setTimeout(r, 5000));

        console.log('Taking screenshot...');
        await page.screenshot({ path: 'debug_cib.png', fullPage: true });

        console.log('Saving HTML...');
        const html = await page.content();
        fs.writeFileSync('debug_cib_puppeteer.html', html);

        console.log('Done.');
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
})();
