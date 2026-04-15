// @spec src/specs/lib/validation.spec.md
import { describe, it, expect } from 'vitest';
import {
    validatePortfolio,
    validateApiKey,
    validateModel,
    isValidDate,
    MAX_NAME_LENGTH,
    MAX_TYPE_LENGTH,
    MAX_RISK_LENGTH,
    MAX_RETURN_LENGTH,
} from './validation';

const VALID_PORTFOLIO = {
    name: 'FPV Skandia Acciones Colombia',
    type: 'RV',
    risk: 'Agresivo',
    value: '1234567890',
    returns: {
        daily: '0.05%',
        monthly: '1.20%',
        sixMonths: '6.50%',
        yearly: '12.30%',
    },
};

describe('validatePortfolio', () => {
    describe('object validation', () => {
        it('should reject null, undefined, and non-objects', () => {
            expect(validatePortfolio(null).valid).toBe(false);
            expect(validatePortfolio(undefined).valid).toBe(false);
            expect(validatePortfolio('string').valid).toBe(false);
            expect(validatePortfolio(42).valid).toBe(false);
            expect(validatePortfolio([]).valid).toBe(false);
        });

        it('should reject missing required fields', () => {
            const { name: _, ...withoutName } = VALID_PORTFOLIO;
            expect(validatePortfolio(withoutName).valid).toBe(false);

            const { type: __, ...withoutType } = VALID_PORTFOLIO;
            expect(validatePortfolio(withoutType).valid).toBe(false);

            const { risk: ___, ...withoutRisk } = VALID_PORTFOLIO;
            expect(validatePortfolio(withoutRisk).valid).toBe(false);

            const { value: ____, ...withoutValue } = VALID_PORTFOLIO;
            expect(validatePortfolio(withoutValue).valid).toBe(false);

            const { returns: _____, ...withoutReturns } = VALID_PORTFOLIO;
            expect(validatePortfolio(withoutReturns).valid).toBe(false);
        });
    });

    describe('name validation', () => {
        it('should reject empty or whitespace-only name', () => {
            expect(validatePortfolio({ ...VALID_PORTFOLIO, name: '' }).valid).toBe(false);
            expect(validatePortfolio({ ...VALID_PORTFOLIO, name: '   ' }).valid).toBe(false);
        });

        it('should reject name exceeding MAX_NAME_LENGTH', () => {
            const longName = 'A'.repeat(MAX_NAME_LENGTH + 1);
            expect(validatePortfolio({ ...VALID_PORTFOLIO, name: longName }).valid).toBe(false);
        });

        it('should reject strings with newline injection', () => {
            expect(validatePortfolio({ ...VALID_PORTFOLIO, name: 'Fondo\nMalicioso' }).valid).toBe(false);
            expect(validatePortfolio({ ...VALID_PORTFOLIO, name: 'Fondo\r\nMalicioso' }).valid).toBe(false);
        });

        it('should reject strings with control characters', () => {
            expect(validatePortfolio({ ...VALID_PORTFOLIO, name: 'Fondo\x00Malicioso' }).valid).toBe(false);
            expect(validatePortfolio({ ...VALID_PORTFOLIO, name: 'Fondo\tMalicioso' }).valid).toBe(false);
        });

        it('should reject name with script injection attempt', () => {
            expect(validatePortfolio({ ...VALID_PORTFOLIO, name: '<script>alert(1)</script>' }).valid).toBe(false);
        });
    });

    describe('type validation', () => {
        it('should reject type exceeding MAX_TYPE_LENGTH', () => {
            const longType = 'A'.repeat(MAX_TYPE_LENGTH + 1);
            expect(validatePortfolio({ ...VALID_PORTFOLIO, type: longType }).valid).toBe(false);
        });

        it('should reject type with invalid characters', () => {
            expect(validatePortfolio({ ...VALID_PORTFOLIO, type: 'RF\nInjection' }).valid).toBe(false);
        });
    });

    describe('risk validation', () => {
        it('should reject risk exceeding MAX_RISK_LENGTH', () => {
            const longRisk = 'A'.repeat(MAX_RISK_LENGTH + 1);
            expect(validatePortfolio({ ...VALID_PORTFOLIO, risk: longRisk }).valid).toBe(false);
        });
    });

    describe('value validation', () => {
        it('should reject value that is not string or number', () => {
            expect(validatePortfolio({ ...VALID_PORTFOLIO, value: null }).valid).toBe(false);
            expect(validatePortfolio({ ...VALID_PORTFOLIO, value: {} }).valid).toBe(false);
            expect(validatePortfolio({ ...VALID_PORTFOLIO, value: [] }).valid).toBe(false);
        });

        it('should accept numeric value', () => {
            expect(validatePortfolio({ ...VALID_PORTFOLIO, value: 9876543 }).valid).toBe(true);
        });
    });

    describe('returns validation', () => {
        it('should reject missing return subfields', () => {
            const { daily: _, ...returnsWithoutDaily } = VALID_PORTFOLIO.returns;
            expect(validatePortfolio({ ...VALID_PORTFOLIO, returns: returnsWithoutDaily }).valid).toBe(false);
        });

        it('should reject return fields exceeding MAX_RETURN_LENGTH', () => {
            const longReturn = '1'.repeat(MAX_RETURN_LENGTH + 1);
            expect(validatePortfolio({ ...VALID_PORTFOLIO, returns: { ...VALID_PORTFOLIO.returns, yearly: longReturn } }).valid).toBe(false);
        });

        it('should reject return fields with invalid characters', () => {
            expect(validatePortfolio({ ...VALID_PORTFOLIO, returns: { ...VALID_PORTFOLIO.returns, yearly: '12%\nINJECTION' } }).valid).toBe(false);
        });
    });

    it('should accept a valid portfolio', () => {
        const result = validatePortfolio(VALID_PORTFOLIO);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
    });
});

describe('validateApiKey', () => {
    it('should reject non-string values', () => {
        expect(validateApiKey(null).valid).toBe(false);
        expect(validateApiKey(123).valid).toBe(false);
        expect(validateApiKey({}).valid).toBe(false);
    });

    it('should reject keys shorter than 20 chars', () => {
        expect(validateApiKey('short').valid).toBe(false);
        expect(validateApiKey('A'.repeat(19)).valid).toBe(false);
    });

    it('should reject keys longer than 100 chars', () => {
        expect(validateApiKey('A'.repeat(101)).valid).toBe(false);
    });

    it('should reject keys with special characters', () => {
        expect(validateApiKey('AIzaSy' + 'A'.repeat(14) + '!@#$').valid).toBe(false);
        expect(validateApiKey('AIzaSy' + 'A'.repeat(14) + ' space').valid).toBe(false);
    });

    it('should accept a valid API key with alphanumerics, hyphens, and underscores', () => {
        expect(validateApiKey('AIzaSy-Valid_Key12345678901').valid).toBe(true);
        expect(validateApiKey('A'.repeat(39)).valid).toBe(true);
    });
});

describe('validateModel', () => {
    it('should return valid when model is absent (undefined, null)', () => {
        expect(validateModel(undefined).valid).toBe(true);
        expect(validateModel(null).valid).toBe(true);
    });

    it('should return false for non-string truthy model', () => {
        expect(validateModel(123).valid).toBe(false);
        expect(validateModel({}).valid).toBe(false);
    });

    it('should reject models not in allowedModels', () => {
        expect(validateModel('gpt-4').valid).toBe(false);
        expect(validateModel('claude-3').valid).toBe(false);
        expect(validateModel('gemini-fake-model').valid).toBe(false);
    });

    it('should accept a model in allowedModels', () => {
        expect(validateModel('gemini-2.5-flash-lite').valid).toBe(true);
        expect(validateModel('gemini-2.5-pro').valid).toBe(true);
    });
});

describe('isValidDate', () => {
    it('should reject invalid date formats', () => {
        expect(isValidDate('14/04/2026')).toBe(false);
        expect(isValidDate('2026-4-14')).toBe(false);
        expect(isValidDate('not-a-date')).toBe(false);
        expect(isValidDate('')).toBe(false);
        expect(isValidDate('2026/04/14')).toBe(false);
    });

    it('should reject date overflow like 2023-02-30', () => {
        expect(isValidDate('2023-02-30')).toBe(false); // Febrero no tiene 30 días
        expect(isValidDate('2023-02-29')).toBe(false); // 2023 no es bisiesto
        expect(isValidDate('2023-04-31')).toBe(false); // Abril tiene 30 días
        expect(isValidDate('2023-13-01')).toBe(false); // Mes inválido
    });

    it('should use UTC for date comparison (not local timezone)', () => {
        // YYYY-MM-DD se parsea como UTC midnight.
        // Si se usara timezone local, podría fallar en zonas con offset negativo.
        expect(isValidDate('2024-01-01')).toBe(true);
        expect(isValidDate('2000-12-31')).toBe(true);
    });

    it('should accept valid dates', () => {
        expect(isValidDate('2023-01-15')).toBe(true);
        expect(isValidDate('2024-02-29')).toBe(true); // 2024 es bisiesto
        expect(isValidDate('2026-04-14')).toBe(true);
    });
});
