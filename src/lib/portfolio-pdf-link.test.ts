// @spec src/specs/lib/portfolio-pdf-link.spec.md
import { describe, it, expect } from 'vitest';
import {
    PORTFOLIO_PDF_ENDPOINT,
    buildPortfolioPdfEndpointUrl,
    buildPdfDataUrl,
    getPdfFileName,
} from './portfolio-pdf-link';

describe('buildPortfolioPdfEndpointUrl', () => {
    it('should build a same-origin endpoint URL', () => {
        const url = buildPortfolioPdfEndpointUrl('FPV Acciones Global');
        expect(url.startsWith(`${PORTFOLIO_PDF_ENDPOINT}?`)).toBe(true);
        expect(new URL(url, 'https://example.test').searchParams.get('name')).toBe('FPV Acciones Global');
    });

    it('should encode special characters in the name', () => {
        const name = 'FPV Tecnología & Más #1';
        const url = buildPortfolioPdfEndpointUrl(name);
        expect(url).not.toContain('&M');
        expect(url).not.toContain('#');
        expect(new URL(url, 'https://example.test').searchParams.get('name')).toBe(name);
    });
});

describe('buildPdfDataUrl', () => {
    it('should build a PDF data URL', () => {
        expect(buildPdfDataUrl('JVBERi0=')).toBe('data:application/pdf;base64,JVBERi0=');
    });
});

describe('getPdfFileName', () => {
    it('should sanitize the file name', () => {
        expect(getPdfFileName('FPV Acciones Global')).toBe('Ficha_Tecnica_FPV_Acciones_Global.pdf');
        expect(getPdfFileName('a"b;c\r\nñ')).toBe('Ficha_Tecnica_a_b_c___.pdf');
    });
});
