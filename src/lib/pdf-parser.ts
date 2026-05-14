const pdf = require('pdf-parse/lib/pdf-parse.js');

/**
 * Pure function that extracts holding names from the raw text of a PDF.
 * Exported for testability — no I/O, no side effects.
 */
const TYPE_KEYWORDS_REGEX = /\s*(?:Rv\. Internacional|Derivados|Liquidez|Fondo Internacional|Financiero Local).*/;

export function extractHoldingsFromText(text: string): string[] {
    const startMarker = "Principales inversiones del portafolio";
    const startIndex = text.indexOf(startMarker);

    if (startIndex === -1) {
        console.warn('[PDF Parser] "Principales inversiones del portafolio" section not found.');
        return [];
    }

    const sectionText = text.slice(startIndex);
    const lines = sectionText.split('\n');

    const holdings: string[] = [];
    let capturing = false;

    for (let line of lines) {
        line = line.trim();
        if (line.length === 0) continue;

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
                const cleanLine = line.replace(/\s+\d+\.\d+%$/, '');

                const name = cleanLine.replace(TYPE_KEYWORDS_REGEX, '').trim();

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
