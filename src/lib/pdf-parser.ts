const pdf = require('pdf-parse/lib/pdf-parse.js');

export async function extractHoldingsFromPdf(pdfBuffer: Buffer): Promise<string[]> {
    try {
        const data = await pdf(pdfBuffer);
        const text = data.text;

        // Find the section "Principales inversiones del portafolio"
        const startMarker = "Principales inversiones del portafolio";
        const startIndex = text.indexOf(startMarker);

        if (startIndex === -1) {
            console.warn('[PDF Parser] "Principales inversiones del portafolio" section not found.');
            return [];
        }

        // Slice text from the marker
        const sectionText = text.slice(startIndex);
        const lines = sectionText.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0);

        const holdings: string[] = [];
        let capturing = false;

        for (const line of lines) {
            // Skip the header line itself and the column headers if they appear
            if (line.includes(startMarker)) {
                capturing = true;
                continue;
            }
            if (line.startsWith("Emisores") || line.startsWith("Tipo de Inversión")) {
                continue;
            }

            // Stop capturing if we hit a new section or empty space that signifies end (heuristic)
            // For now, let's grab the first 10 lines that look like holdings or until we see a known footer/next section.
            // A simple heuristic: lines that end with a percentage symbol or look like a table row.
            // However, pdf-parse often outputs text line by line.
            // The screenshot shows "Jpmorgan...", "Pinebridge...", etc.

            // Let's try to extract the first part of the line which is the Issuer.
            // The lines might be mixed up depending on layout, but usually pdf-parse preserves order reasonably well for simple tables.

            // Heuristic: If the line ends with a percentage (e.g. "33.09%"), it's likely a holding row.
            // We want to extract the name at the beginning.

            // Regex to match a line ending in a percentage
            const holdingRegex = /^(.+?)\s+(?:Rv\. Internacional|Derivados|Liquidez|Fondo Internacional|Financiero Local).+\d+\.\d+%$/i;
            // Actually, pdf-parse might just give the text without strict columns. 
            // Let's look for lines that look like: "Name ... ... %"

            // Simpler approach: Just grab the first few words of lines that follow the header, 
            // excluding lines that are clearly headers or footers.

            if (capturing) {
                // If we have collected enough, stop.
                if (holdings.length >= 10) break;

                // Check if line looks like a holding (ends with %)
                if (/\d+\.\d+%$/.test(line)) {
                    // It ends with a percentage. Let's try to get the name.
                    // The name is likely everything before the first known column value or just the first few words.
                    // Given the screenshot: "Jpmorgan Global Research... Rv. Internacional..."
                    // We can try to split by known "Tipo de Inversión" values if possible, or just take the first 3-4 words.

                    // Let's try to clean it up.
                    // Remove the percentage and the numbers at the end.
                    let cleanLine = line.replace(/\s+\d+\.\d+%$/, '');

                    // Remove known sectors/types if they are at the end of the cleanLine
                    // This is tricky without a comprehensive list. 
                    // But we can just take the whole line as a search query context, or try to be smarter.

                    // For search purposes, the full line "Jpmorgan Global Research Enhanced Equity Esg Etf" is good.
                    // The "Rv. Internacional..." part might confuse search if not separated.

                    // Let's try to split by multiple spaces if pdf-parse preserves them, but it often doesn't.
                    // Let's assume the name is the first part.

                    // Heuristic: Split by common "Tipo de Inversión" keywords if present?
                    // "Rv. Internacional", "Derivados", "Liquidez"
                    const typeKeywords = ["Rv. Internacional", "Derivados", "Liquidez", "Fondo Internacional", "Financiero Local"];
                    let name = cleanLine;
                    for (const keyword of typeKeywords) {
                        const idx = name.indexOf(keyword);
                        if (idx !== -1) {
                            name = name.substring(0, idx).trim();
                        }
                    }

                    if (name.length > 3) { // Filter out noise
                        holdings.push(name);
                    }
                }
            }
        }

        console.log('[PDF Parser] Extracted holdings:', holdings);
        return holdings;

    } catch (error) {
        console.error('[PDF Parser] Error parsing PDF:', error);
        return [];
    }
}
