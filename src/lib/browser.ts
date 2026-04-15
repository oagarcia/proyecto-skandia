import puppeteer, { Browser } from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

/**
 * Returns a configured Puppeteer browser instance that works both in
 * local development (Mac) and serverless environments (Vercel).
 */
export async function getBrowser(): Promise<Browser> {
    console.log('[Browser] Launching browser...');
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let options: any = {};
    const isDev = process.env.NODE_ENV === 'development';
    
    if (isDev) {
        // Local Mac environment
        options = {
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ],
            // Use local Chrome path by default, or specific environment variable
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            headless: true,
        };
    } else {
        // Production environments (Vercel, Render.com)
        options = {
            args: chromium.args,
            executablePath: await chromium.executablePath(
                'https://github.com/Sparticuz/chromium/releases/download/v143.0.4/chromium-v143.0.4-pack.x64.tar'
            ),
            headless: true,
            // 🛡️ SENTINEL: Enforce strict TLS certificate validation.
            // ignoreHTTPSErrors must never be used in production to prevent MitM attacks.
        };
    }

    return await puppeteer.launch(options);
}
