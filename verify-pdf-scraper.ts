
import { getPortfolioPdf } from './src/lib/pdf-scraper';

async function test() {
    console.log('Testing PDF Scraper...');
    const portfolioName = 'FPV Acciones Global'; // Use a known portfolio

    try {
        const result = await getPortfolioPdf(portfolioName);

        if (result.pdfUrl && result.pdfBase64) {
            console.log('SUCCESS: PDF fetched successfully!');
            console.log('URL:', result.pdfUrl);
            console.log('Base64 Length:', result.pdfBase64.length);
        } else {
            console.error('FAILURE: PDF not fetched (null result).');
        }
    } catch (error) {
        console.error('FAILURE: Error during fetch:', error);
    }
}

test();
