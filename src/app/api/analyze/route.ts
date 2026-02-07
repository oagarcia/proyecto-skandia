import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getPortfolioPdf } from '@/lib/pdf-scraper';
import { searchGoogleNews } from '@/lib/news-scraper';
import { extractHoldingsFromPdf } from '@/lib/pdf-parser';
import { yahooFinanceResearchConfig } from '@/config/yahoo-finance-settings';
import { fetchYahooFinanceData } from '@/lib/yahoo-finance';
import { validatePortfolio } from '@/lib/validation';

interface TextPart {
    text: string;
}

interface InlineDataPart {
    inlineData: {
        mimeType: string;
        data: string;
    };
}

type Part = TextPart | InlineDataPart;

export async function POST(request: Request) {
    try {
        const { portfolio, apiKey, model: selectedModel } = await request.json();

        // 1. Input Validation
        if (!apiKey) {
            return NextResponse.json({ success: false, error: 'API Key is required' }, { status: 400 });
        }

        const validation = validatePortfolio(portfolio);
        if (!validation.isValid) {
            console.warn('[Analyze API] Validation failed:', validation.error);
            return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
        }

        // Use the validated portfolio object
        const validPortfolio = validation.portfolio!;

        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(apiKey);

        // Fetch PDF (Ficha Técnica)
        console.log(`[Analysis] Fetching PDF for ${validPortfolio.name}...`);
        const { pdfBase64, pdfUrl } = await getPortfolioPdf(validPortfolio.name);

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
                query = `Skandia Colombia "${validPortfolio.name}" economia mercado`;
            }


            // 3b. Yahoo Finance Research (Config Check)
            // @ts-expect-error - Accessing by dynamic key
            const yahooSymbols = yahooFinanceResearchConfig.portfolios[validPortfolio.name];

            if (yahooSymbols && Array.isArray(yahooSymbols) && yahooSymbols.length > 0) {
                console.log(`[Analyze API] Yahoo Finance configuration found for ${validPortfolio.name}:`, yahooSymbols);
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

Nombre: ${validPortfolio.name}
Tipo: ${validPortfolio.type}
      Perfil de Riesgo: ${validPortfolio.risk}
Valor: ${validPortfolio.value} Millones COP

Rentabilidades:
- Diaria: ${validPortfolio.returns.daily}
- Mensual: ${validPortfolio.returns.monthly}
- 6 Meses: ${validPortfolio.returns.sixMonths}
- Anual(YTD): ${validPortfolio.returns.yearly}
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

        let lastError: unknown;

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
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.warn(`Failed with model ${modelName}: `, errorMessage);
                lastError = error;
                // Continue to next model
            }
        }

        // If all failed
        const lastErrorMessage = lastError instanceof Error ? lastError.message : 'Unknown error';
        console.error('All models failed. Last error:', lastErrorMessage);

        return NextResponse.json({
            success: false,
            error: 'Failed to generate analysis with all available models. Please check your API key or try again later.'
        }, { status: 500 });

    } catch (error: unknown) {
        console.error('Gemini API Error:', error);
        return NextResponse.json({
            success: false,
            error: 'An internal server error occurred'
        }, { status: 500 });
    }
}
