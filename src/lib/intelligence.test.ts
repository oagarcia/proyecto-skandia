// @spec src/specs/lib/intelligence.spec.md
import { describe, it, expect } from 'vitest';
import { analyzePortfolio } from './intelligence';

const makePortfolio = (overrides: Record<string, unknown> = {}) => ({
    name: 'FPV Skandia Test',
    type: 'RV',
    risk: 'Moderado',
    value: '1000000',
    returns: {
        daily: '0.01%',
        monthly: '1.00%',
        sixMonths: '5.00%',
        yearly: '12.00%',
        ...((overrides.returns as object) ?? {}),
    },
    ...overrides,
});

describe('analyzePortfolio - scoring', () => {
    it('should add 30 points for yearly returns > 15%', () => {
        const result = analyzePortfolio(makePortfolio({ returns: { daily: '0%', monthly: '-1%', sixMonths: '0%', yearly: '16%' } }));
        // Base 50 + 30 (yearly > 15) = 80
        expect(result.score).toBe(80);
    });

    it('should add 20 points for yearly returns > 10%', () => {
        const result = analyzePortfolio(makePortfolio({ returns: { daily: '0%', monthly: '-1%', sixMonths: '0%', yearly: '12%' } }));
        // Base 50 + 20 (yearly > 10) = 70
        expect(result.score).toBe(70);
    });

    it('should add 10 points for yearly returns > 5%', () => {
        const result = analyzePortfolio(makePortfolio({ returns: { daily: '0%', monthly: '-1%', sixMonths: '0%', yearly: '7%' } }));
        // Base 50 + 10 (yearly > 5) = 60
        expect(result.score).toBe(60);
    });

    it('should subtract 20 points for negative yearly returns', () => {
        const result = analyzePortfolio(makePortfolio({ returns: { daily: '0%', monthly: '-1%', sixMonths: '0%', yearly: '-5%' } }));
        // Base 50 - 20 (yearly < 0) = 30
        expect(result.score).toBe(30);
    });

    it('should add 5 points for positive momentum (monthly > 0 && yearly > 0)', () => {
        const result = analyzePortfolio(makePortfolio({ returns: { daily: '0%', monthly: '1%', sixMonths: '0%', yearly: '7%' } }));
        // Base 50 + 10 (yearly > 5) + 5 (momentum) = 65
        expect(result.score).toBe(65);
    });

    it('should NOT add momentum bonus when monthly is negative', () => {
        const result = analyzePortfolio(makePortfolio({ returns: { daily: '0%', monthly: '-1%', sixMonths: '0%', yearly: '7%' } }));
        // Base 50 + 10 (yearly > 5) = 60 (sin momentum)
        expect(result.score).toBe(60);
    });

    it('should support comma as decimal separator in return values', () => {
        // Returns con coma como separador decimal (formato colombiano)
        const result = analyzePortfolio(makePortfolio({ returns: { daily: '0%', monthly: '-1%', sixMonths: '0%', yearly: '12,50%' } }));
        // 12.50 > 10, así que +20 → score = 70
        expect(result.score).toBe(70);
    });
});

describe('analyzePortfolio - risk profile cap', () => {
    it('should cap score at 80 for Conservador risk profile', () => {
        // yearly 16% → score 80 + sin momentum → 80. Con Conservador el cap es 80.
        const result = analyzePortfolio(makePortfolio({
            risk: 'Conservador',
            returns: { daily: '0%', monthly: '1%', sixMonths: '0%', yearly: '16%' },
        }));
        // Sin cap: 50 + 30 + 5 = 85. Con cap: 80.
        expect(result.score).toBe(80);
    });

    it('should NOT cap score for Agresivo risk profile', () => {
        const result = analyzePortfolio(makePortfolio({
            risk: 'Agresivo',
            returns: { daily: '0%', monthly: '1%', sixMonths: '0%', yearly: '16%' },
        }));
        // 50 + 30 + 5 = 85. Sin cap para Agresivo.
        expect(result.score).toBe(85);
    });
});

describe('analyzePortfolio - recommendation mapping', () => {
    it('should recommend Strong Buy for score >= 80', () => {
        const result = analyzePortfolio(makePortfolio({
            risk: 'Agresivo',
            returns: { daily: '0%', monthly: '1%', sixMonths: '0%', yearly: '16%' },
        }));
        expect(result.recommendation).toBe('Strong Buy');
    });

    it('should recommend Buy for score between 60 and 79', () => {
        // Score 70: base 50 + 20 (yearly>10)
        const result = analyzePortfolio(makePortfolio({
            returns: { daily: '0%', monthly: '-1%', sixMonths: '0%', yearly: '12%' },
        }));
        expect(result.recommendation).toBe('Buy');
    });

    it('should recommend Hold for score between 31 and 59', () => {
        // Score 50: base 50, yearly entre 0-5%
        const result = analyzePortfolio(makePortfolio({
            returns: { daily: '0%', monthly: '-1%', sixMonths: '0%', yearly: '3%' },
        }));
        expect(result.recommendation).toBe('Hold');
    });

    it('should recommend Sell for score <= 30', () => {
        // Score 30: base 50 - 20 (yearly < 0)
        const result = analyzePortfolio(makePortfolio({
            returns: { daily: '0%', monthly: '-1%', sixMonths: '0%', yearly: '-5%' },
        }));
        expect(result.recommendation).toBe('Sell');
    });
});

describe('analyzePortfolio - type-based analysis', () => {
    it('should include currency risk for global portfolios (name includes Global)', () => {
        const result = analyzePortfolio(makePortfolio({ name: 'FPV Skandia Global Growth' }));
        expect(result.risks).toContain('Riesgo cambiario (TRM)');
    });

    it('should include currency risk for S&P portfolios', () => {
        const result = analyzePortfolio(makePortfolio({ name: 'FPV Skandia S&P 500' }));
        expect(result.risks).toContain('Riesgo cambiario (TRM)');
    });

    it('should include country risk for Colombian portfolios', () => {
        const result = analyzePortfolio(makePortfolio({ name: 'FPV Skandia Acciones Colombia' }));
        expect(result.risks).toContain('Riesgo país y político local');
    });

    it('should include sector concentration risk for tech portfolios', () => {
        const result = analyzePortfolio(makePortfolio({ name: 'FPV Skandia Acciones Nuevas Tecnología' }));
        expect(result.risks).toContain('Concentración sectorial');
    });

    it('should include fixed income risks for RF type', () => {
        const result = analyzePortfolio(makePortfolio({ type: 'RF' }));
        expect(result.risks.some(r => r.includes('tasa de interés'))).toBe(true);
    });
});

describe('analyzePortfolio - return structure', () => {
    it('should return a complete AnalysisResult object', () => {
        const result = analyzePortfolio(makePortfolio());
        expect(result).toHaveProperty('summary');
        expect(result).toHaveProperty('risks');
        expect(result).toHaveProperty('advantages');
        expect(result).toHaveProperty('recommendation');
        expect(result).toHaveProperty('score');
        expect(typeof result.summary).toBe('string');
        expect(Array.isArray(result.risks)).toBe(true);
        expect(Array.isArray(result.advantages)).toBe(true);
        expect(['Strong Buy', 'Buy', 'Hold', 'Sell']).toContain(result.recommendation);
        expect(typeof result.score).toBe('number');
    });
});
