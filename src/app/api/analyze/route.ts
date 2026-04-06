import { NextResponse } from 'next/server';
import { Browser } from 'puppeteer-core';
import { getBrowser } from '@/lib/browser';
import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import { getPortfolioPdf } from '@/lib/pdf-scraper';
import { searchGoogleNews } from '@/lib/news-scraper';
import { extractHoldingsFromPdf } from '@/lib/pdf-parser';
import { yahooFinanceResearchConfig } from '@/config/yahoo-finance-settings';
import { fetchYahooFinanceDataForSymbols } from '@/lib/yahoo-finance';
import { validatePortfolio, validateApiKey, validateModel } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
    let browser: Browser | null = null;
    try {
        // Rate Limiting
        // Prefer x-real-ip to mitigate trivial IP spoofing bypass via x-forwarded-for
        const realIp = request.headers.get('x-real-ip');
        const forwardedFor = request.headers.get('x-forwarded-for');
        const ip = realIp || (forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown');
        if (!checkRateLimit(ip, 20, 60 * 1000)) { // 5 requests per minute per IP
            return NextResponse.json({ success: false, error: 'Too many requests. Please try again later.' }, { status: 429 });
        }

        const { portfolio, apiKey, model: selectedModel } = await request.json();

        if (!apiKey) {
            return NextResponse.json({ success: false, error: 'API Key is required' }, { status: 400 });
        }

        const apiKeyValidation = validateApiKey(apiKey);
        if (!apiKeyValidation.valid) {
            return NextResponse.json({ success: false, error: apiKeyValidation.error }, { status: 400 });
        }

        const modelValidation = validateModel(selectedModel);
        if (!modelValidation.valid) {
            return NextResponse.json({ success: false, error: modelValidation.error }, { status: 400 });
        }

        // Input validation
        const validation = validatePortfolio(portfolio);
        if (!validation.valid) {
            return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
        }

        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(apiKey);

        // Launch Browser Shared Instance
        try {
            console.log('[Analyze API] Launching shared browser instance...');
            browser = await getBrowser();
        } catch (e) {
            console.warn('[Analyze API] Failed to launch shared browser, falling back to individual instances:', e);
        }

        // --- PARALLEL FETCHING START ---
        // 1. Start Fetching PDF (Ficha Técnica)
        console.log(`[Analysis] Fetching PDF for ${portfolio.name}...`);
        const pdfPromise = getPortfolioPdf(portfolio.name, browser || undefined);

        // 2. Start Yahoo Finance Research if configured
        let yahooPromise: Promise<string> | null = null;
        // @ts-expect-error - yahooFinanceResearchConfig type might not match exact structure but it works
        const yahooSymbols = yahooFinanceResearchConfig.portfolios[portfolio.name];

        if (yahooSymbols && Array.isArray(yahooSymbols) && yahooSymbols.length > 0) {
            console.log(`[Analyze API] Yahoo Finance configuration found for ${portfolio.name}:`, yahooSymbols);
            yahooPromise = fetchYahooFinanceDataForSymbols(yahooSymbols, browser || undefined);
        }

        // --- AWAIT RESULTS ---
        // We await the PDF result first as it might be needed for fallback logic
        const { pdfBase64, pdfUrl } = await pdfPromise;

        let newsContext = "";
        let newsSourceLabel = "CONTEXTO DE NOTICIAS RECIENTES (Obtenido vía Google News)";
        let extractedHoldings: string[] = [];

        try {
            // Extract holdings from PDF if available
            if (pdfBase64) {
                try {
                    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
                    extractedHoldings = await extractHoldingsFromPdf(pdfBuffer);
                    console.log(`[Analyze API] Extracted holdings: ${extractedHoldings.join(', ')} `);
                } catch (e) {
                    console.error('[Analyze API] Error extracting holdings from PDF:', e);
                }
            }

            // Check Yahoo Promise Result
            if (yahooPromise) {
                const yahooResult = await yahooPromise;
                if (!yahooResult.startsWith("Error")) {
                    newsContext = yahooResult;
                    newsSourceLabel = "FUENTE: YAHOO FINANCE (Configuración Específica)";
                } else {
                    console.warn('[Analyze API] Yahoo Finance fetch failed/error, falling back to Google News:', yahooResult);
                }
            }

            // Fallback to Google News if Yahoo was not configured or failed
            if (!newsContext) {
                // Construct search query
                let query = "";
                if (extractedHoldings.length > 0) {
                    // Use top 5 holdings for the search query with OR operator
                    // Example: "Holding 1" OR "Holding 2" OR "Holding 3"
                    const topHoldings = extractedHoldings.slice(0, 5).map(h => `"${h}"`).join(' OR ');
                    query = `${topHoldings}`;
                } else {
                    // Fallback query
                    query = `Skandia Colombia "${portfolio.name}" economia mercado`;
                }

                console.log(`[Analyze API] Fetching Google news for query: ${query} `);
                newsContext = await searchGoogleNews(query, browser || undefined);

                if (!newsContext || newsContext.length < 50) {
                    console.log('[Analyze API] No specific news found, trying broader query...');
                    let broadQuery = "Skandia Colombia economía mercado financiero";

                    if (extractedHoldings.length > 0) {
                        // Fallback to just the first holding if available
                        broadQuery = `"${extractedHoldings[0]}"`;
                        console.log(`[Analyze API] Using first holding for fallback: ${broadQuery}`);
                    }

                    newsContext = await searchGoogleNews(broadQuery, browser || undefined);
                }
            }

            console.log(`[Analyze API] News fetched(length: ${newsContext.length})`);


        } catch (error) {
            console.error('[Analyze API] Error fetching news:', error);
            newsContext = "No se pudieron obtener noticias en tiempo real.";
        }
        let prompt = `
      Actúa como un analista financiero senior.Analiza el siguiente portafolio de inversión de Skandia Colombia:

Nombre: ${portfolio.name}
Tipo: ${portfolio.type}
      Perfil de Riesgo: ${portfolio.risk}
Valor: ${portfolio.value} Millones COP

Rentabilidades:
- Diaria: ${portfolio.returns.daily}
- Mensual: ${portfolio.returns.monthly}
- 6 Meses: ${portfolio.returns.sixMonths}
- Anual(YTD): ${portfolio.returns.yearly}
`;

        const parts: Part[] = [];

        if (pdfBase64) {
            console.log('[Analysis] PDF fetched successfully. Attaching to prompt.');
            prompt += `\n\nHe adjuntado la "Ficha Técnica" oficial(PDF) de este portafolio.Por favor, utiliza los datos de este PDF(composiciones, comentarios del gestor, gráficos históricos, comisiones, etc.) para proporcionar un análisis mucho más detallado y preciso.Prioriza los datos del PDF si entran en conflicto con el resumen anterior.`;

            parts.push({
                inlineData: {
                    data: pdfBase64,
                    mimeType: "application/pdf",
                },
            });
        } else {
            console.warn('[Analysis] PDF could not be fetched. Proceeding with text-only analysis.');
            prompt += `\n\n(Nota: No se pudo recuperar la ficha técnica en PDF.Por favor analiza basándote solo en los datos de resumen proporcionados.)`;
        }

        prompt += `
      Por favor proporciona un reporte completo en markdown estructurado de la siguiente manera:

      ## 1. Resumen Ejecutivo
      ¿Qué es este portafolio y para quién es ?

      ## 2. Análisis de Rentabilidad
      Interpreta las rentabilidades. ¿Está funcionando bien dado el contexto del mercado ?

      ## 3. Evaluación de Riesgo
      ¿Es el perfil de riesgo consistente con los retornos ?

      ## 4. Composición y Estrategia
    (Extrae esto del PDF si está disponible). ¿En qué invierte ?

      ## 5. Análisis de Noticias y Sentimiento(Tiempo Real)
      Fecha actual: ${new Date().toLocaleDateString('es-CO')}
      
      ${newsSourceLabel}:
      ${newsContext}
      
      Instrucciones OBLIGATORIAS para esta sección:
- DEBES incluir esta sección en tu respuesta.
      - IMPORTANTE: Para cada noticia analizada, DEBES conservar el enlace de fuente proporcionado en el contexto (formato [Fuente Noticia](url)). NO elimines estos enlaces.
      - El formato de cada noticia debe ser:
        - Título de la noticia
        - Resumen/Análisis
        - [Fuente Noticia](url) (Chip style)
      - Utiliza las noticias proporcionadas arriba para evaluar el sentimiento actual del mercado.
      - Si las noticias mencionan específicamente a Skandia o los activos del portafolio, destácalo.
      - Si las noticias son generales, relaciónalas con la composición del portafolio.
      - Si NO hay noticias relevantes, indica explícitamente: "No se encontraron noticias específicas recientes para este portafolio, pero basándonos en el contexto general..." y procede con un análisis de mercado general.

      ## 6. Veredicto
      Recomendación de Compra, Mantener o Venta para un inversor a largo plazo.
      
      Usa viñetas para los detalles y mantén un tono profesional.
    `;

        parts.push({ text: prompt });

        // Determine which model to use
        // If selectedModel is provided, use it. Otherwise fallback to list.
        const modelsToTry = selectedModel ? [selectedModel] : [
            'gemini-2.5-flash',
            'gemini-2.0-flash',
            'gemini-2.5-pro',
            'gemini-flash-latest'
        ];

        let lastError;

        for (const modelName of modelsToTry) {
            try {
                console.log(`Attempting to generate with model: ${modelName} `);
                // Disable Google Search Grounding since we are manually injecting news
                const model = genAI.getGenerativeModel({
                    model: modelName
                });

                const result = await model.generateContent(parts);
                const response = await result.response;
                const text = response.text();

                return NextResponse.json({
                    success: true,
                    analysis: text,
                    modelUsed: modelName,
                    pdfUrl: pdfUrl
                });

            } catch (error: unknown) {
                // SENTINEL: Do not log or leak detailed error messages to user context. Just log it.
                console.warn(`Failed with model ${modelName}: `, error);
                lastError = error;
                // Continue to next model
            }
        }

        // If all failed
        console.error('All models failed. Last error:', lastError);

        // SECURE ERROR HANDLING: Avoid leaking model lists or internal error details
        return NextResponse.json({
            success: false,
            error: 'Failed to generate analysis with available models. Please check your API key permissions or try again later.'
        }, { status: 500 });

    } catch (error: unknown) {
        console.error('Gemini API Error:', error);
        return NextResponse.json({
            success: false,
            error: 'An internal error occurred during analysis generation.'
        }, { status: 500 });
    } finally {
        if (browser) {
            console.log('[Analyze API] Closing shared browser instance...');
            await browser.close().catch(e => console.error('Error closing browser:', e));
        }
    }
}
