
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { apiKey } = await request.json();

        if (!apiKey) {
            return NextResponse.json({ success: false, error: 'API Key is required' }, { status: 400 });
        }

        // Fetch models from Google Generative AI API
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

        if (!response.ok) {
            const errorData = await response.json();
            return NextResponse.json({
                success: false,
                error: errorData.error?.message || 'Failed to fetch models'
            }, { status: response.status });
        }

        const data = await response.json();

        // Filter for models that support content generation
        // Usually these start with "models/gemini" and support "generateContent"
        const models = (data.models || [])
            .filter((m: any) => m.name.includes('gemini') && m.supportedGenerationMethods?.includes('generateContent'))
            .map((m: any) => m.name.replace('models/', '')) // Remove 'models/' prefix for cleaner display
            .sort((a: string, b: string) => b.localeCompare(a)); // Sort roughly by newest (higher numbers/versions)

        return NextResponse.json({
            success: true,
            models: models
        });

    } catch (error: any) {
        console.error('Models API Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Internal server error'
        }, { status: 500 });
    }
}
