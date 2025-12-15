import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getPortfolioPdf } from '@/lib/pdf-scraper';
import { searchGoogleNews } from '@/lib/news-scraper';
import { extractHoldingsFromPdf } from '@/lib/pdf-parser';
import { yahooFinanceResearchConfig } from '@/config/yahoo-finance-settings';
import { fetchYahooFinanceData } from '@/lib/yahoo-finance';

export async function POST(request: Request) {
    try {
        const { portfolio, apiKey, model: selectedModel } = await request.json();

        if (!apiKey) {
            return NextResponse.json({ success: false, error: 'API Key is required' }, { status: 400 });
        }

        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(apiKey);

        // Fetch PDF (Ficha Técnica)
        console.log(`[Analysis] Fetching PDF for ${portfolio.name}...`);
        const { pdfBase64, pdfUrl } = await getPortfolioPdf(portfolio.name);

        // 3. Obtener noticias en tiempo real (Manual Scraper)
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


            // 3b. Yahoo Finance Research (Config Check)
            // @ts-ignore
            const yahooSymbols = yahooFinanceResearchConfig.portfolios[portfolio.name];

            if (yahooSymbols && Array.isArray(yahooSymbols) && yahooSymbols.length > 0) {
                console.log(`[Analyze API] Yahoo Finance configuration found for ${portfolio.name}:`, yahooSymbols);
                newsSourceLabel = "FUENTE: YAHOO FINANCE (Configuración Específica)";
                newsContext = ""; // Clear default context if any

                for (const symbol of yahooSymbols) {
                    const data = await fetchYahooFinanceData(symbol);
                    newsContext += `\n${data}\n`;
                }

            } else {
                // Fallback to existing Google News Search
                console.log(`[Analyze API] No Yahoo config. Fetching Google news for query: ${query} `);
                newsContext = await searchGoogleNews(query);

                if (!newsContext || newsContext.length < 50) {
                    console.log('[Analyze API] No specific news found, trying broader query...');
                    let broadQuery = "Skandia Colombia economía mercado financiero";

                    if (extractedHoldings.length > 0) {
                        // Fallback to just the first holding if available
                        broadQuery = `"${extractedHoldings[0]}"`;
                        console.log(`[Analyze API] Using first holding for fallback: ${broadQuery}`);
                    }

                    newsContext = await searchGoogleNews(broadQuery);
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

        const parts: any[] = [];

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

            } catch (error: any) {
                console.warn(`Failed with model ${modelName}: `, error.message);
                lastError = error;
                // Continue to next model
            }
        }

        // If all failed
        console.error('All models failed. Last error:', lastError);

        // DEBUG: Try to list available models to understand why
        try {
            const listResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const listData = await listResp.json();
            console.log('DEBUG: Available models for this key:', JSON.stringify(listData, null, 2));

            return NextResponse.json({
                success: false,
                error: `All models failed. Last error: ${lastError?.message}. Available models: ${listData.models?.map((m: any) => m.name).join(', ') || 'None found'}`
            }, { status: 500 });
        } catch (debugError) {
            console.error('Failed to list models:', debugError);
        }

        return NextResponse.json({
            success: false,
            error: `All models failed. Last error: ${lastError?.message || 'Unknown error'}`
        }, { status: 500 });

    } catch (error: any) {
        console.error('Gemini API Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to generate analysis'
        }, { status: 500 });
    }
}
