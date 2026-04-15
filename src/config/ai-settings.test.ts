// @spec src/specs/config/ai-settings.spec.md
import { describe, it, expect } from 'vitest';
import { aiSettings } from './ai-settings';

describe('aiSettings configuration invariants', () => {
    it('defaultModel must be in allowedModels when restrictModels is true', () => {
        if (aiSettings.restrictModels) {
            expect(aiSettings.allowedModels).toContain(aiSettings.defaultModel);
        }
    });

    it('allowedModels must not be empty', () => {
        expect(aiSettings.allowedModels.length).toBeGreaterThan(0);
    });

    it('all allowedModels must be non-empty strings', () => {
        for (const model of aiSettings.allowedModels) {
            expect(typeof model).toBe('string');
            expect(model.length).toBeGreaterThan(0);
        }
    });
});
