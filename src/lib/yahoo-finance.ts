import puppeteer from 'puppeteer';
import { yahooFinanceResearchConfig } from '@/config/yahoo-finance-settings';

export async function fetchYahooFinanceData(symbol: string): Promise<string> {
    const mainUrl = `https://finance.yahoo.com/quote/${symbol}/`;
    console.log(`[Yahoo Finance] Launching Puppeteer for ${symbol}...`);

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const page = await browser.newPage();

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
        console.log(`[Yahoo Finance] Navigating to ${mainUrl}...`);

        // Timeout generoso para evitar fallos por red lenta
        await page.goto(mainUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Esperar selectores clave
        try {
            // Esperamos a que aparezca al menos un streamer o el contenedor de precio
            await page.waitForSelector('fin-streamer[data-field="regularMarketPrice"]', { timeout: 15000 });
            console.log('[Yahoo Finance] Price element found.');
        } catch (e) {
            console.log('[Yahoo Finance] Price/Header element wait timeout, trying to proceed...');
        }

        const data = await page.evaluate(() => {
            let log = `\n--- INFORMACIÓN YAHOO FINANCE ---\n`;

            // Extracción robusta usando selectores específicos de Yahoo Finance (fin-streamer)
            const getStreamerValue = (field: string) => {
                const el = document.querySelector(`fin-streamer[data-field="${field}"]`);
                return el ? el.textContent?.trim() : "N/A";
            };

            const price = getStreamerValue('regularMarketPrice');
            const change = getStreamerValue('regularMarketChange');
            const pct = getStreamerValue('regularMarketChangePercent');

            log += `PRECIO ACTUAL: ${price}\n`;
            log += `CAMBIO: ${change} (${pct})\n\n`;

            return { log };
        });

        let extractedText = data.log;
        extractedText += `URL Principal: [${mainUrl}](${mainUrl})\n`;
        extractedText += "NOTICIAS RECIENTES (Con detalle):\n";

        // Extracción de noticias
        const newsLinks = await page.evaluate((maxNews) => {
            const results: { title: string, url: string }[] = [];

            // Buscar sección de noticias reciente
            // Estrategia 1: data-testid="storyitem" (visto en debug)
            // Estrategia 2: buscamos dentro de #news-bhfljgl2 o similar
            const storyItems = document.querySelectorAll('[data-testid="storyitem"]');

            for (let item of Array.from(storyItems)) {
                const titleEl = item.querySelector('h3');
                const linkEl = item.querySelector('a');

                if (titleEl && linkEl && linkEl.href) {
                    const title = titleEl.textContent?.trim() || "";
                    const url = linkEl.href;

                    // Filtros básicos de calidad
                    if (title.length > 10 && !title.includes("Ad") && !url.includes("google")) {
                        results.push({ title, url });
                    }
                }
                if (results.length >= maxNews) break;
            }

            // Fallback: Si no hay storyitems, buscar enlaces generales en la sección de noticias
            if (results.length === 0) {
                const newsSection = document.querySelector('[data-testid="recent-news"]');
                if (newsSection) {
                    const links = newsSection.querySelectorAll('h3 a, a h3'); // A veces el h3 está dentro del a, o al revés
                    for (let el of Array.from(links)) {
                        // Navegar al nodo A si tenemos el h3
                        const aTag = el.tagName === 'A' ? el : el.closest('a');
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
        }, yahooFinanceResearchConfig.settings?.maxNewsToAnalyze || 5);

        console.log(`[Yahoo Finance] Found ${newsLinks.length} news items.`);

        // Deep Dive
        for (const item of newsLinks) {
            // Ignorar enlaces que no sean noticias reales (e.g. video, landing pages raras)
            if (!item.url.includes('finance.yahoo.com/news') && !item.url.includes('finance.yahoo.com/m/')) {
                continue;
            }

            console.log(`[Yahoo Finance] Scraping article: ${item.title}`);
            extractedText += `\n### [${item.title}](${item.url})\n`;

            try {
                extractedText += await scrapeArticleContent(browser, item.url);
            } catch (e) {
                console.error('[Yahoo Finance] Error scraping article detail', e);
                extractedText += `(No se pudo cargar el detalle)\n`;
            }
        }

        if (newsLinks.length === 0) {
            extractedText += "No se encontraron noticias recientes automáticamente.\n";
        }

        await browser.close();
        return extractedText;

    } catch (error: any) {
        if (browser) await browser.close();
        console.error(`[Yahoo Finance] Error scraping ${symbol}:`, error);
        return `Error recuperando información para ${symbol} (Puppeteer): ${error.message}`;
    }
}

async function scrapeArticleContent(browser: any, url: string): Promise<string> {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (req: any) => {
        if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
            req.abort();
        } else {
            req.continue();
        }
    });

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

        const summary = await page.evaluate(() => {
            // Yahoo news articles typically use class 'caas-body'
            const body = document.querySelector('.caas-body');
            if (body) {
                const paragraphs = Array.from(body.querySelectorAll('p'));
                return paragraphs
                    .map(p => p.textContent?.trim() || "")
                    .filter(t => t.length > 50)
                    .slice(0, 5) // Top 5 paragraphs
                    .join('\n\n');
            }
            // Fallback generic
            const paragraphs = Array.from(document.querySelectorAll('article p, .body p'));
            return paragraphs.map(p => p.textContent?.trim()).slice(0, 4).join('\n\n');
        });

        await page.close();
        if (summary && summary.length > 0) {
            return `Resumen:\n> ${summary.replace(/\n/g, '\n> ')}\n`;
        }
        return "(Sin contenido extraíble)\n";

    } catch (e) {
        if (page) await page.close();
        return "(Error cargando artículo)\n";
    }
}
