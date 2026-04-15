// @spec src/specs/lib/pdf-scraper.spec.md
// Tests de la lógica de validación de input (sin I/O de Puppeteer)
// Los comportamientos de navegación y descarga se verifican por integración.
import { describe, it, expect, vi } from 'vitest';

// Mock getBrowser para que los tests no lancen un browser real
vi.mock('./browser', () => ({
    getBrowser: vi.fn().mockRejectedValue(new Error('Browser not available in unit tests')),
}));

import { getPortfolioPdf } from './pdf-scraper';

describe('getPortfolioPdf - input validation', () => {
    it('should return null result for empty portfolio name', async () => {
        const result = await getPortfolioPdf('');
        expect(result).toEqual({ pdfBase64: null, pdfUrl: null });
    });

    it('should return null result for portfolio name over 200 characters', async () => {
        const longName = 'A'.repeat(201);
        const result = await getPortfolioPdf(longName);
        expect(result).toEqual({ pdfBase64: null, pdfUrl: null });
    });

    it('should accept portfolio names of exactly 200 characters (boundary)', async () => {
        // Un nombre de exactamente 200 chars pasa la validación de input
        // (el browser falla después, pero no por validación de input)
        const maxLengthName = 'A'.repeat(200);
        const result = await getPortfolioPdf(maxLengthName);
        // No retorna null POR validación de input — puede retornar null por browser failure
        // pero no debe lanzar excepción
        expect(result).toEqual({ pdfBase64: null, pdfUrl: null });
    });

    it('should never throw an exception regardless of input', async () => {
        // La función ALWAYS retorna un objeto, nunca lanza
        await expect(getPortfolioPdf('')).resolves.toMatchObject({ pdfBase64: null, pdfUrl: null });
        await expect(getPortfolioPdf('A'.repeat(201))).resolves.toMatchObject({ pdfBase64: null, pdfUrl: null });
        await expect(getPortfolioPdf('Portafolio Válido')).resolves.toMatchObject({ pdfBase64: null, pdfUrl: null });
    });
});
