
import { NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/validation';

export async function POST(request: Request) {
    try {
        let body;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
        }

        const { apiKey } = body;

        if (!apiKey) {
            return NextResponse.json({ success: false, error: 'API Key is required' }, { status: 400 });
        }

        // Validate API Key format
        const validation = validateApiKey(apiKey);
        if (!validation.valid) {
            return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
        }

        // Securely construct URL
        const url = new URL('https://generativelanguage.googleapis.com/v1beta/models');
        url.searchParams.append('key', apiKey);

        // Fetch models from Google Generative AI API
        const response = await fetch(url.toString());

        if (!response.ok) {
            const errorData = await response.json();
            // Log detailed error internally but return generic error to client
            console.error('Google API Error:', errorData);
            return NextResponse.json({
                success: false,
                error: 'Failed to fetch models from provider.'
            }, { status: response.status });
        }

        const data = await response.json();

        // Filter for models that support content generation
        // Usually these start with "models/gemini" and support "generateContent"
        const models = (data.models || [])
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((m: any) => m.name.includes('gemini') && m.supportedGenerationMethods?.includes('generateContent'))
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((m: any) => m.name.replace('models/', '')) // Remove 'models/' prefix for cleaner display
            .sort((a: string, b: string) => b.localeCompare(a)); // Sort roughly by newest (higher numbers/versions)

        return NextResponse.json({
            success: true,
            models: models
        });

    } catch (error: unknown) {
        console.error('Models API Error:', error);
        return NextResponse.json({
            success: false,
            error: 'An internal error occurred while processing your request.'
        }, { status: 500 });
    }
}
