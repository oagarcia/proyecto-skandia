import puppeteer, { Browser } from 'puppeteer';
import { yahooFinanceResearchConfig } from '@/config/yahoo-finance-settings';

// Function to fetch data for multiple symbols using a single browser instance
export async function fetchYahooFinanceDataForSymbols(symbols: string[], browserInstance?: Browser): Promise<string> {
    let browser = browserInstance;
    let ownBrowser = false;

    try {
        if (!browser) {
            console.log(`[Yahoo Finance] Launching shared browser for ${symbols.length} symbols...`);
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            });
            ownBrowser = true;
        } else {
            console.log(`[Yahoo Finance] Using shared browser instance for ${symbols.length} symbols...`);
        }

        // Execute symbol scraping in parallel
        const promises = symbols.map(symbol => fetchYahooDataWithBrowser(browser!, symbol));
        const results = await Promise.all(promises);

        return results.join('\n');
    } catch (error: unknown) {
        console.error('[Yahoo Finance] Error in shared browser session:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `Error fetching data for symbols: ${errorMessage}`;
    } finally {
        if (ownBrowser && browser) await browser.close();
    }
}

// Wrapper for single symbol to maintain backward compatibility (if needed)
export async function fetchYahooFinanceData(symbol: string, browserInstance?: Browser): Promise<string> {
    return fetchYahooFinanceDataForSymbols([symbol], browserInstance);
}


async function fetchYahooDataWithBrowser(browser: Browser, symbol: string): Promise<string> {
    const mainUrl = `https://finance.yahoo.com/quote/${symbol}/`;
    console.log(`[Yahoo Finance] Processing ${symbol}...`);

    let page;
    try {
        page = await browser.newPage();

        // Optimizar carga bloqueando recursos innecesarios
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        await page.setViewport({ width: 1280, height: 800 });

        // Timeout generoso para evitar fallos por red lenta
        await page.goto(mainUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        console.log(`[Yahoo Finance] Navigated to ${mainUrl}`);

        // Esperar selectores clave
        try {
            await page.waitForSelector('fin-streamer[data-field="regularMarketPrice"]', { timeout: 15000 });
        } catch {
            console.log(`[Yahoo Finance] Price element wait timeout for ${symbol}, trying to proceed...`);
        }

        // Use string evaluation to avoid transpilation issues (e.g. __name undefined)
        // Interpolate symbol directly into the string IIFE
        const data = await page.evaluate(`((symbol) => {
            let log = "\\n--- INFORMACIÓN YAHOO FINANCE: " + symbol + " ---\\n";

            const getStreamerValue = (field) => {
                const el = document.querySelector('fin-streamer[data-field="' + field + '"][data-symbol="' + symbol + '"]');
                return el ? el.textContent.trim() : null;
            };

            const getPriceByTestId = () => {
                const el = document.querySelector('[data-test="qsp-price"]');
                return el ? el.textContent.trim() : null;
            };

            let price = getStreamerValue('regularMarketPrice') || getPriceByTestId() || "N/A";
            const change = getStreamerValue('regularMarketChange') || "N/A";
            const pct = getStreamerValue('regularMarketChangePercent') || "N/A";

            if (price === "N/A") {
                const mainPriceEl = document.querySelector('section[data-testid="quote-price"] fin-streamer[data-field="regularMarketPrice"]');
                if (mainPriceEl) price = (mainPriceEl.textContent && mainPriceEl.textContent.trim()) || "N/A";
            }

            log += "PRECIO ACTUAL: " + price + "\\n";
            log += "CAMBIO: " + change + " (" + pct + ")\\n\\n";

            return { log };
        })("${symbol}")`);

        let extractedText = data.log;
        extractedText += `[Fuente Yahoo Finance](${mainUrl})\n`;
        extractedText += "NOTICIAS RECIENTES (Con detalle):\n";

        // Extracción de noticias
        const maxNews = yahooFinanceResearchConfig.settings?.maxNewsToAnalyze || 5;
        const newsLinks = await page.evaluate(`((maxNews) => {
            const results = [];
            const storyItems = document.querySelectorAll('[data-testid="storyitem"]');

            for (let item of Array.from(storyItems)) {
                const titleEl = item.querySelector('h3');
                const linkEl = item.querySelector('a');

                if (titleEl && linkEl && linkEl.href) {
                    const title = titleEl.textContent ? titleEl.textContent.trim() : "";
                    const url = linkEl.href;

                    // Filtros básicos de calidad
                    if (title.length > 10 && !title.includes("Ad") && !url.includes("google")) {
                        results.push({ title, url });
                    }
                }
                if (results.length >= maxNews) break;
            }

            // Fallback
            if (results.length === 0) {
                const newsSection = document.querySelector('[data-testid="recent-news"]');
                if (newsSection) {
                    const links = newsSection.querySelectorAll('h3 a, a h3');
                    for (let el of Array.from(links)) {
                        const aTag = (el.tagName === 'A' ? el : el.closest('a'));
                        if (aTag && aTag.href && aTag.textContent) {
                            results.push({
                                title: aTag.textContent.trim(),
                                url: aTag.href
                            });
                        }
                        if (results.length >= maxNews) break;
                    }
                }
            }
            return results;
        })(${maxNews})`);

        console.log(`[Yahoo Finance] Found ${newsLinks.length} news items for ${symbol}.`);

        // Close page before processing articles to save resources
        await page.close();

        // Parallelize article scraping
        const articlePromises = newsLinks
            .filter((item: { url: string; title: string }) => item.url.includes('finance.yahoo.com/news') || item.url.includes('finance.yahoo.com/m/'))
            .map(async (item: { url: string; title: string }) => {
                 console.log(`[Yahoo Finance] Scraping article: ${item.title}`);
                 let content = `\n### ${item.title}\n`;
                 try {
                     content += await scrapeArticleContent(browser, item.url);
                 } catch (e) {
                     console.error('[Yahoo Finance] Error scraping article detail', e);
                     content += `(No se pudo cargar el detalle)\n [Fuente](${item.url})\n`;
                 }
                 return content;
            });

        const articleResults = await Promise.all(articlePromises);
        extractedText += articleResults.join('');

        if (newsLinks.length === 0) {
            extractedText += "No se encontraron noticias recientes automáticamente.\n";
        }

        return extractedText;

    } catch (error: unknown) {
        if (page && !page.isClosed()) await page.close().catch(() => {});
        console.error(`[Yahoo Finance] Error scraping ${symbol}:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `Error recuperando información para ${symbol}: ${errorMessage}`;
    }
}

async function scrapeArticleContent(browser: Browser, url: string): Promise<string> {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (req) => {
        if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
            req.abort();
        } else {
            req.continue();
        }
    });

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        // console.log('go to article url -----------> ', url);

        const summary = await page.evaluate(`(() => {
            const body = document.querySelector('.caas-body');
            if (body) {
                const paragraphs = Array.from(body.querySelectorAll('p'));
                return paragraphs
                    .map(p => p.textContent ? p.textContent.trim() : "")
                    .filter(t => t.length > 50)
                    .slice(0, 5)
                    .join('\\n\\n');
            }
            const paragraphs = Array.from(document.querySelectorAll('article p, .body p'));
            return paragraphs.map(p => p.textContent ? p.textContent.trim() : "").slice(0, 4).join('\\n\\n');
        })()`);

        await page.close();
        if (summary && (summary as string).length > 0) {
            return `Resumen:\n> ${(summary as string).replace(/\n/g, '\n> ')}\n\n[Fuente Noticia](${url})\n`;
        }
        return `(Sin contenido extraíble)\n\n[Fuente Noticia](${url})\n`;

    } catch {
        if (page && !page.isClosed()) await page.close().catch(() => {});
        return "(Error cargando artículo)\n";
    }
}
