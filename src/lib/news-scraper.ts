import puppeteer, { Browser } from 'puppeteer';

export async function searchGoogleNews(query: string, browserInstance?: Browser): Promise<string> {
    // 🛡️ SENTINEL: Add input length limits to prevent DoS via extremely long queries.
    // Extremely long strings processed by Puppeteer evaluate functions or external
    // services can cause excessive memory consumption or network timeouts.
    if (!query || query.length > 200) {
        console.warn(`[News Scraper] Invalid query: Query is empty or exceeds maximum length of 200 characters. Truncating.`);
        query = query ? query.substring(0, 200) : "";
        if (!query) {
             return "No se pudieron obtener noticias en tiempo real debido a una consulta inválida.";
        }
    }

    console.log(`[News Scraper] Searching for: ${query}`);
    let browser = browserInstance;
    let ownBrowser = false;

    try {
        if (!browser) {
            console.log(`[News Scraper] Launching new browser...`);
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            ownBrowser = true;
        } else {
            console.log(`[News Scraper] Using shared browser instance...`);
        }

        const page = await browser.newPage();

        // Set a real User-Agent to avoid being served old/mobile versions
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

        // Navigate to Google News search
        // Using hl=en and gl=US to ensure global coverage for international assets
        // This fixes the issue where "clean" searches yield 0 results for specific ETFs
        // SENTINEL: Using URLSearchParams to construct query strings prevents SSRF
        // and malformed URLs by automatically encoding parameters correctly.
        const urlObj = new URL('https://www.google.com/search');
        urlObj.searchParams.set('q', query);
        urlObj.searchParams.set('tbm', 'nws');
        urlObj.searchParams.set('hl', 'en');
        urlObj.searchParams.set('gl', 'US');
        urlObj.searchParams.set('tbs', 'qdr:m');
        const searchUrl = urlObj.toString();

        console.log(`---------------------------------------------------`);
        console.log(`---------------------------------------------------`);
        console.log(`---------------------------------------------------`);
        console.log(`[News Scraper] Navigating to: ${searchUrl}`);
        console.log(`---------------------------------------------------`);
        console.log(`---------------------------------------------------`);
        console.log(`---------------------------------------------------`);
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
        if (ownBrowser && browser) await browser.close();
    }
}
