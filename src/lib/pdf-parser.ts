const pdf = require('pdf-parse/lib/pdf-parse.js');

/**
 * Pure function that extracts holding names from the raw text of a PDF.
 * Exported for testability — no I/O, no side effects.
 */
export function extractHoldingsFromText(text: string): string[] {
    const startMarker = "Principales inversiones del portafolio";
    const startIndex = text.indexOf(startMarker);

    if (startIndex === -1) {
        console.warn('[PDF Parser] "Principales inversiones del portafolio" section not found.');
        return [];
    }

    const sectionText = text.slice(startIndex);
    const lines = sectionText.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0);

    const holdings: string[] = [];
    let capturing = false;

    for (const line of lines) {
        if (line.includes(startMarker)) {
            capturing = true;
            continue;
        }
        if (line.startsWith("Emisores") || line.startsWith("Tipo de Inversión")) {
            continue;
        }

        if (capturing) {
            if (holdings.length >= 10) break;

            if (/\d+\.\d+%$/.test(line)) {
                let cleanLine = line.replace(/\s+\d+\.\d+%$/, '');

                const typeKeywords = ["Rv. Internacional", "Derivados", "Liquidez", "Fondo Internacional", "Financiero Local"];
                let name = cleanLine;
                for (const keyword of typeKeywords) {
                    const idx = name.indexOf(keyword);
                    if (idx !== -1) {
                        name = name.substring(0, idx).trim();
                    }
                }

                if (name.length > 3) {
                    holdings.push(name);
                }
            }
        }
    }

    return holdings;
}

export async function extractHoldingsFromPdf(pdfBuffer: Buffer): Promise<string[]> {
    try {
        const data = await pdf(pdfBuffer);
        const holdings = extractHoldingsFromText(data.text);
        console.log('[PDF Parser] Extracted holdings:', holdings);
        return holdings;
    } catch (error) {
        console.error('[PDF Parser] Error parsing PDF:', error);
        return [];
    }
}
