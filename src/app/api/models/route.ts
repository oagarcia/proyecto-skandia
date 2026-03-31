
import { NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
    try {
        // Rate Limiting
        // Prefer x-real-ip to mitigate trivial IP spoofing bypass via x-forwarded-for
        const realIp = request.headers.get('x-real-ip');
        const forwardedFor = request.headers.get('x-forwarded-for');
        const ip = realIp || (forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown');
        if (!checkRateLimit(ip, 20, 60 * 1000)) { // 10 requests per minute per IP
            return NextResponse.json({ success: false, error: 'Too many requests. Please try again later.' }, { status: 429 });
        }

        const { apiKey } = await request.json();

        if (!apiKey) {
            return NextResponse.json({ success: false, error: 'API Key is required' }, { status: 400 });
        }

        const apiKeyValidation = validateApiKey(apiKey);
        if (!apiKeyValidation.valid) {
            return NextResponse.json({ success: false, error: apiKeyValidation.error }, { status: 400 });
        }

        // Fetch models from Google Generative AI API
        // SENTINEL: Use x-goog-api-key header instead of query parameter to prevent API key leakage in URLs (CWE-598).
        // Added AbortSignal.timeout to prevent DoS via hanging connections.
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
            headers: {
                'x-goog-api-key': apiKey
            },
            signal: AbortSignal.timeout(15000)
        });

        if (!response.ok) {
            const errorData = await response.json();
            // SENTINEL: Do not leak detailed Google error messages which might contain sensitive info or internal paths
            const errorMessage = errorData.error?.message?.includes('API key')
                ? 'Invalid API Key provided'
                : 'Failed to fetch models from Google AI Service';

            return NextResponse.json({
                success: false,
                error: errorMessage
            }, { status: response.status });
        }

        const data = await response.json();

        // Filter for models that support content generation
        // Usually these start with "models/gemini" and support "generateContent"
        const models = (data.models || [])
            .filter((m: { name: string; supportedGenerationMethods?: string[] }) => m.name.includes('gemini') && m.supportedGenerationMethods?.includes('generateContent'))
            .map((m: { name: string; supportedGenerationMethods?: string[] }) => m.name.replace('models/', '')) // Remove 'models/' prefix for cleaner display
            .sort((a: string, b: string) => b.localeCompare(a)); // Sort roughly by newest (higher numbers/versions)

        return NextResponse.json({
            success: true,
            models: models
        });

    } catch (error: unknown) {
        console.error('Models API Error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 });
    }
}
