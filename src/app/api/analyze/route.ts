import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getPortfolioPdf } from '@/lib/pdf-scraper';

export async function POST(request: Request) {
    try {
        const { portfolio, apiKey } = await request.json();

        if (!apiKey) {
            return NextResponse.json({ success: false, error: 'API Key is required' }, { status: 400 });
        }

        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(apiKey);

        // Fetch PDF (Ficha Técnica)
        console.log(`[Analysis] Fetching PDF for ${portfolio.name}...`);
        const { pdfBase64, pdfUrl } = await getPortfolioPdf(portfolio.name);

        let prompt = `
      Actúa como un analista financiero senior. Analiza el siguiente portafolio de inversión de Skandia Colombia:
      
      Nombre: ${portfolio.name}
      Tipo: ${portfolio.type}
      Perfil de Riesgo: ${portfolio.risk}
      Valor: ${portfolio.value} Millones COP
      
      Rentabilidades:
      - Diaria: ${portfolio.returns.daily}
      - Mensual: ${portfolio.returns.monthly}
      - 6 Meses: ${portfolio.returns.sixMonths}
      - Anual (YTD): ${portfolio.returns.yearly}
    `;

        const parts: any[] = [];

        if (pdfBase64) {
            console.log('[Analysis] PDF fetched successfully. Attaching to prompt.');
            prompt += `\n\nHe adjuntado la "Ficha Técnica" oficial (PDF) de este portafolio. Por favor, utiliza los datos de este PDF (composiciones, comentarios del gestor, gráficos históricos, comisiones, etc.) para proporcionar un análisis mucho más detallado y preciso. Prioriza los datos del PDF si entran en conflicto con el resumen anterior.`;

            parts.push({
                inlineData: {
                    data: pdfBase64,
                    mimeType: "application/pdf",
                },
            });
        } else {
            console.warn('[Analysis] PDF could not be fetched. Proceeding with text-only analysis.');
            prompt += `\n\n(Nota: No se pudo recuperar la ficha técnica en PDF. Por favor analiza basándote solo en los datos de resumen proporcionados.)`;
        }

        prompt += `
      Por favor proporciona un reporte completo en markdown con:
      1. **Resumen Ejecutivo**: ¿Qué es este portafolio y para quién es?
      2. **Análisis de Rentabilidad**: Interpreta las rentabilidades. ¿Está funcionando bien dado el contexto del mercado?
      3. **Evaluación de Riesgo**: ¿Es el perfil de riesgo consistente con los retornos?
      4. **Composición y Estrategia**: (Extrae esto del PDF si está disponible). ¿En qué invierte?
      5. **Veredicto**: Recomendación de Compra, Mantener o Venta para un inversor a largo plazo.
      
      Formato con encabezados en negrita, viñetas y tono profesional.
    `;

        parts.push({ text: prompt });

        // Models to try in order of preference (Flash is faster/cheaper, Pro is better)
        // For PDF analysis, Pro models are often better, but Flash 1.5+ supports it too.
        // Let's try 1.5 Pro first for best PDF understanding, then Flash.
        const modelsToTry = [
            'gemini-2.5-flash',
            'gemini-2.0-flash',
            'gemini-2.5-pro',
            'gemini-2.0-pro-exp',
            'gemini-flash-latest'
        ];

        let lastError;

        for (const modelName of modelsToTry) {
            try {
                console.log(`Attempting to generate with model: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });

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
                console.warn(`Failed with model ${modelName}:`, error.message);
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
