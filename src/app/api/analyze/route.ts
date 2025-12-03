import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
    try {
        const { portfolio, apiKey } = await request.json();

        if (!apiKey) {
            return NextResponse.json({ success: false, error: 'API Key is required' }, { status: 400 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        // List of models to try in order of preference
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

                const prompt = `
              Actúa como un experto asesor financiero de alto nivel. Analiza el siguiente portafolio de inversión de Skandia y genera un reporte detallado.
              
              Datos del Portafolio:
              - Nombre: ${portfolio.name}
              - Tipo: ${portfolio.type}
              - Valor del Fondo: ${portfolio.value} Millones COP
              - Perfil de Riesgo: ${portfolio.risk}
              - Rentabilidad Diaria: ${portfolio.returns.daily}
              - Rentabilidad Mensual: ${portfolio.returns.monthly}
              - Rentabilidad Semestral: ${portfolio.returns.sixMonths}
              - Rentabilidad Anual (YTD): ${portfolio.returns.yearly}

              Tu análisis debe incluir:
              1. **Resumen Ejecutivo**: Interpretación de las rentabilidades (corto vs largo plazo). ¿Es consistente? ¿Está en recuperación?
              2. **Análisis de Riesgos**: Riesgos específicos basados en el tipo de activo (Renta Variable, Fija, etc.) y la situación actual del mercado global/local implícita.
              3. **Ventajas Competitivas**: Por qué elegir este fondo.
              4. **Veredicto Final**: Una recomendación clara (Comprar, Mantener, Vender) con una justificación breve.

              Formato de salida: Markdown limpio y bien estructurado. Usa negritas para resaltar puntos clave. No uses bloques de código, solo texto formateado.
            `;

                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();

                return NextResponse.json({ success: true, analysis: text, modelUsed: modelName });

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
