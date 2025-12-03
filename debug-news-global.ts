
import puppeteer from 'puppeteer';
import fs from 'fs';

async function debugGlobalNews() {
    console.log('Debugging Global Google News...');
    const query = `"Ishares Global Tech Etf" OR "Blackrock World Technology" OR "Fidelity Global Technology Fund I" OR "Jpm Us Tech Leaders Etf" OR "Banco Bilbao Viz"`;

    // Exact URL from user request but forcing US/EN to see if it matches their results
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=nws&tbs=qdr:y&hl=en&gl=US`;

    console.log(`Navigating to: ${searchUrl}`);

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // User Agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    await page.goto(searchUrl, { waitUntil: 'networkidle2' });

    // Take screenshot
    await page.screenshot({ path: 'debug-news-screenshot.png', fullPage: true });
    console.log('Screenshot saved to debug-news-screenshot.png');

    // Save HTML
    const html = await page.content();
    fs.writeFileSync('debug-news.html', html);
    console.log('HTML saved to debug-news.html');

    // Try extraction with current selectors
    const results = await page.evaluate(() => {
        const items = document.querySelectorAll('div.SoaBEf, div.MjjYud');
        return Array.from(items).map(item => {
            const title = item.querySelector('div[role="heading"], h3')?.textContent?.trim();
            const time = item.querySelector('.OSrXXb span, .LfVVr')?.textContent?.trim();
            return { title, time };
        });
    });

    console.log('Found items with current selectors:', results);

    await browser.close();
}

debugGlobalNews();
