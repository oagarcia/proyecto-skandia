import { describe, it, expect } from 'vitest';

describe('Yahoo Finance URL Validation', () => {
    it('should validate proper URLs and reject SSRF attempts', () => {
        const validateUrl = (url: string) => {
            try {
                const parsedUrl = new URL(url);
                return parsedUrl.hostname === 'finance.yahoo.com' &&
                    (parsedUrl.pathname.startsWith('/news/') || parsedUrl.pathname.startsWith('/m/'));
            } catch {
                return false;
            }
        };

        expect(validateUrl("https://finance.yahoo.com/news/article123")).toBe(true);
        expect(validateUrl("https://finance.yahoo.com/m/article456")).toBe(true);
        expect(validateUrl("http://attacker.com/?finance.yahoo.com/news")).toBe(false);
        expect(validateUrl("https://other.domain.com/finance.yahoo.com/news")).toBe(false);
    });
});
