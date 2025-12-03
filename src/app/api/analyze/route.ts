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
        const pdfBase64 = await getPortfolioPdf(portfolio.name);

        let prompt = `
      Act as a senior financial analyst. Analyze the following investment portfolio from Skandia Colombia:
      
      Name: ${portfolio.name}
      Type: ${portfolio.type}
      Risk Profile: ${portfolio.risk}
      Value: ${portfolio.value} Million COP
      
      Returns:
      - Daily: ${portfolio.returns.daily}
      - Monthly: ${portfolio.returns.monthly}
      - 6 Months: ${portfolio.returns.sixMonths}
      - Yearly (YTD): ${portfolio.returns.yearly}
    `;

        const parts: any[] = [];

        if (pdfBase64) {
            console.log('[Analysis] PDF fetched successfully. Attaching to prompt.');
            prompt += `\n\nI have attached the official "Ficha Técnica" (Technical Sheet) PDF for this portfolio. Please use the data in this PDF (holdings, manager comments, historical performance graphs, fees, etc.) to provide a much more detailed and accurate analysis. Prioritize the PDF data if it conflicts with the summary above.`;

            parts.push({
                inlineData: {
                    data: pdfBase64,
                    mimeType: "application/pdf",
                },
            });
        } else {
            console.warn('[Analysis] PDF could not be fetched. Proceeding with text-only analysis.');
            prompt += `\n\n(Note: The technical sheet PDF could not be retrieved. Please analyze based on the provided summary data only.)`;
        }

        prompt += `
      Please provide a comprehensive markdown report with:
      1. **Executive Summary**: What is this portfolio and who is it for?
      2. **Performance Analysis**: Interpret the returns. Is it performing well given the market context?
      3. **Risk Assessment**: Is the risk profile consistent with the returns?
      4. **Key Holdings & Strategy**: (Extract this from the PDF if available). What is it investing in?
      5. **Verdict**: Buy, Hold, or Sell recommendation for a long-term investor.
      
      Format with bold headings, bullet points, and professional tone.
    `;

        parts.push({ text: prompt });

        // Models to try in order of preference (Flash is faster/cheaper, Pro is better)
        // For PDF analysis, Pro models are often better, but Flash 1.5+ supports it too.
        // Let's try 1.5 Pro first for best PDF understanding, then Flash.
        const modelsToTry = [
            'gemini-1.5-pro',
            'gemini-1.5-flash',
            'gemini-2.0-flash-exp', // If available
        ];

        let lastError;

        for (const modelName of modelsToTry) {
            try {
                console.log(`Attempting to generate with model: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });

                const result = await model.generateContent(parts);
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
