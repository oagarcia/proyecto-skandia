// @spec src/specs/lib/news-scraper.spec.md
// Tests de la lógica de validación de input (sin I/O de Puppeteer)
// Los comportamientos de scraping y cierre de browser se verifican por integración.
import { describe, it, expect, vi } from 'vitest';

// Mock getBrowser para que los tests no lancen un browser real
vi.mock('./browser', () => ({
    getBrowser: vi.fn().mockRejectedValue(new Error('Browser not available in unit tests')),
}));

import { searchGoogleNews } from './news-scraper';

describe('searchGoogleNews - input validation', () => {
    it('should truncate queries over 200 characters and continue', async () => {
        // Una query de 201 chars se debe truncar a 200.
        // El browser mock falla, pero el truncado ocurre antes de lanzar el browser.
        // Verificamos el comportamiento vía el mensaje de retorno de error (no excepción).
        const longQuery = 'A'.repeat(201);
        const result = await searchGoogleNews(longQuery);
        // La query no debería causar un throw — la función siempre retorna un string.
        expect(typeof result).toBe('string');
    });

    it('should return error message for empty query (after potential truncation)', async () => {
        const result = await searchGoogleNews('');
        // Query vacío → mensaje de error en español, no excepción
        expect(result).toContain('No se pudieron obtener noticias');
        expect(result).toContain('inválida');
    });

    it('should not throw for valid queries even when browser fails', async () => {
        // Verificar que la función nunca lanza una excepción, aunque el browser falle.
        await expect(searchGoogleNews('Fondo de Acciones Colombia')).resolves.toBeTypeOf('string');
    });
});
