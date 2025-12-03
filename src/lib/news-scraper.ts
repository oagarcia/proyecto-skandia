import puppeteer from 'puppeteer';

export async function searchGoogleNews(query: string): Promise<string> {
    console.log(`[News Scraper] Searching for: ${query}`);
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        // Set a real User-Agent to avoid being served old/mobile versions
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

        // Navigate to Google News search
        // Added &tbs=qdr:y to filter for news from the past year
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=nws&hl=es&gl=CO&tbs=qdr:y`;
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });

        // Extract news items
        const newsItems = await page.evaluate(() => {
            const results: string[] = [];
            // Selectors for Google News results (these may change, need to be robust)
            // Common containers for news results
            const articles = document.querySelectorAll('div.SoaBEf, div.MjjYud');

            articles.forEach((article, index) => {
                if (index >= 5) return; // Limit to top 5 results

                const titleElement = article.querySelector('div[role="heading"], h3');
                const snippetElement = article.querySelector('.GI74Re, .OSrXXb');
                const timeElement = article.querySelector('.OSrXXb span, .LfVVr');
                const sourceElement = article.querySelector('.NUnG9d span, .MgUUmf span');

                const title = titleElement?.textContent?.trim() || '';
                const snippet = snippetElement?.textContent?.trim() || '';
                const time = timeElement?.textContent?.trim() || '';
                const source = sourceElement?.textContent?.trim() || '';

                if (title) {
                    results.push(`- **${title}** (${source}, ${time}): ${snippet}`);
                }
            });
            return results;
        });

        console.log(`[News Scraper] Found ${newsItems.length} articles.`);
        return newsItems.join('\n');

    } catch (error) {
        console.error('[News Scraper] Error fetching news:', error);
        return "No se pudieron obtener noticias en tiempo real debido a un error técnico.";
    } finally {
        if (browser) await browser.close();
    }
}
