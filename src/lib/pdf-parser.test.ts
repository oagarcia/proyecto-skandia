// @spec src/specs/lib/pdf-parser.spec.md
import { describe, it, expect } from 'vitest';
import { extractHoldingsFromText } from './pdf-parser';

// Tests de la lógica pura de parseo de texto (sin I/O de PDF)
// extractHoldingsFromPdf solo añade la capa de I/O sobre esta función

const SECTION_HEADER = 'Principales inversiones del portafolio';

const makePdfText = (holdingLines: string[]) =>
    `Ficha Técnica del Portafolio\n${SECTION_HEADER}\nEmisores\n${holdingLines.join('\n')}`;

describe('extractHoldingsFromText', () => {
    it('should return empty array when section marker is not found', () => {
        const result = extractHoldingsFromText('Texto del PDF sin la sección esperada');
        expect(result).toEqual([]);
    });

    it('should return empty array for text with section but no holding lines (no % endings)', () => {
        const text = `${SECTION_HEADER}\nEmisores\nEsta sección no tiene líneas con porcentajes`;
        const result = extractHoldingsFromText(text);
        expect(result).toEqual([]);
    });

    it('should extract holdings from lines ending in percentage', () => {
        const lines = [
            'Jpmorgan Global Research Enhanced Equity Esg Etf Rv. Internacional 33.09%',
            'Pinebridge Global Dynamic Asset Allocation Fund Fondo Internacional 25.00%',
        ];
        const result = extractHoldingsFromText(makePdfText(lines));
        expect(result.length).toBe(2);
        expect(result.some(h => h.includes('Jpmorgan'))).toBe(true);
        expect(result.some(h => h.includes('Pinebridge'))).toBe(true);
    });

    it('should strip type keywords from holding names', () => {
        const lines = [
            'Jpmorgan Global Research Enhanced Equity Rv. Internacional 33.09%',
        ];
        const result = extractHoldingsFromText(makePdfText(lines));
        expect(result[0]).not.toContain('Rv. Internacional');
        expect(result[0]).toContain('Jpmorgan');
    });

    it('should strip Derivados keyword from holding names', () => {
        const lines = ['Some Fund Name Derivados 12.50%'];
        const result = extractHoldingsFromText(makePdfText(lines));
        expect(result[0]).not.toContain('Derivados');
    });

    it('should return at most 10 holdings', () => {
        // Generar 15 líneas de holdings válidos
        const lines = Array.from({ length: 15 }, (_, i) =>
            `Holding Name ${String(i + 1).padStart(2, '0')} Fund Rv. Internacional ${(i + 1).toFixed(2)}%`
        );
        const result = extractHoldingsFromText(makePdfText(lines));
        expect(result.length).toBeLessThanOrEqual(10);
    });

    it('should filter out noise entries with 3 or fewer characters', () => {
        // Una línea donde el nombre después de limpiar quedaría muy corto
        const lines = ['A Rv. Internacional 5.00%'];
        const result = extractHoldingsFromText(makePdfText(lines));
        expect(result).toEqual([]);
    });

    it('should skip column header lines (Emisores, Tipo de Inversión)', () => {
        const text = `${SECTION_HEADER}\nEmisores\nTipo de Inversión\nJpmorgan Global Research Rv. Internacional 33.09%`;
        const result = extractHoldingsFromText(text);
        expect(result.length).toBe(1);
        expect(result[0]).toContain('Jpmorgan');
    });
});
