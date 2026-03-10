export const MAX_NAME_LENGTH = 100;
export const MAX_TYPE_LENGTH = 50;
export const MAX_RISK_LENGTH = 50;
export const MAX_VALUE_LENGTH = 50;
export const MAX_RETURN_LENGTH = 20;

import { aiSettings } from '@/config/ai-settings';


// Regex for safe text: Alphanumeric, spaces, common punctuation, Spanish accents.
// Explicitly rejects newlines and other control characters to prevent prompt injection.
const SAFE_TEXT_REGEX = /^[a-zA-Z0-9 .,\-\(\)'&%+\áéíóúÁÉÍÓÚñÑüÜ]+$/;

export interface Portfolio {
  name: string;
  type: string;
  risk: string;
  value: string | number;
  returns: {
    daily: string;
    monthly: string;
    sixMonths: string;
    yearly: string;
  };
}

export function validatePortfolio(data: unknown): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid portfolio data: must be an object' };
  }

  const obj = data as Record<string, unknown>;

  const requiredFields = ['name', 'type', 'risk', 'value', 'returns'];
  for (const field of requiredFields) {
    if (!(field in obj)) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }

  if (typeof obj.name !== 'string' || obj.name.trim() === '') {
    return { valid: false, error: 'Invalid name' };
  }
  if (obj.name.length > MAX_NAME_LENGTH) {
    return { valid: false, error: `Name exceeds max length of ${MAX_NAME_LENGTH}` };
  }
  if (!SAFE_TEXT_REGEX.test(obj.name)) {
    return { valid: false, error: 'Name contains invalid characters' };
  }

  // Basic type checks
  if (typeof obj.type !== 'string') return { valid: false, error: 'Invalid type' };
  if (obj.type.length > MAX_TYPE_LENGTH) return { valid: false, error: `Type exceeds max length of ${MAX_TYPE_LENGTH}` };
  if (!SAFE_TEXT_REGEX.test(obj.type)) {
    return { valid: false, error: 'Type contains invalid characters' };
  }

  if (typeof obj.risk !== 'string') return { valid: false, error: 'Invalid risk' };
  if (obj.risk.length > MAX_RISK_LENGTH) return { valid: false, error: `Risk exceeds max length of ${MAX_RISK_LENGTH}` };
  if (!SAFE_TEXT_REGEX.test(obj.risk)) {
    return { valid: false, error: 'Risk contains invalid characters' };
  }

  if (typeof obj.value !== 'string' && typeof obj.value !== 'number') {
    return { valid: false, error: 'Invalid value: must be string or number' };
  }
  if (typeof obj.value === 'string') {
    if (obj.value.length > MAX_VALUE_LENGTH) {
      return { valid: false, error: `Value exceeds max length of ${MAX_VALUE_LENGTH}` };
    }
    if (!SAFE_TEXT_REGEX.test(obj.value)) {
      return { valid: false, error: 'Value contains invalid characters' };
    }
  }

  if (typeof obj.returns !== 'object' || obj.returns === null) {
    return { valid: false, error: 'Invalid returns object' };
  }

  const returnsObj = obj.returns as Record<string, unknown>;
  const returnFields = ['daily', 'monthly', 'sixMonths', 'yearly'];
  for (const field of returnFields) {
    if (!(field in returnsObj)) {
      return { valid: false, error: `Missing return field: ${field}` };
    }
    const val = returnsObj[field];
    if (typeof val !== 'string') {
      return { valid: false, error: `Invalid return field type: ${field}` };
    }
    if (val.length > MAX_RETURN_LENGTH) {
      return { valid: false, error: `Return field ${field} exceeds max length of ${MAX_RETURN_LENGTH}` };
    }
    if (!SAFE_TEXT_REGEX.test(val)) {
      return { valid: false, error: `Return field ${field} contains invalid characters` };
    }
  }

  return { valid: true };
}

export function validateApiKey(key: unknown): { valid: boolean; error?: string } {
  if (typeof key !== 'string') {
    return { valid: false, error: 'API Key must be a string' };
  }
  // Google AI keys are typically around 39 characters.
  // We allow a safe range (20-100) to accommodate variations but prevent massive payloads.
  if (key.length < 20 || key.length > 100) {
    return { valid: false, error: 'API Key length must be between 20 and 100 characters' };
  }

  // Ensure only safe characters are used (Alphanumeric, hyphen, underscore)
  // This prevents injection attacks via the key field.
  const apiKeyRegex = /^[a-zA-Z0-9_\-]+$/;
  if (!apiKeyRegex.test(key)) {
    return { valid: false, error: 'API Key contains invalid characters' };
  }

  return { valid: true };
}

export function validateModel(model: unknown): { valid: boolean; error?: string } {
  if (!model) return { valid: true }; // Optional, falls back to default list if not provided
  if (typeof model !== 'string') {
    return { valid: false, error: 'Model must be a string' };
  }
  if (!aiSettings.allowedModels.includes(model)) {
    return { valid: false, error: 'Invalid model selected' };
  }
  return { valid: true };
}

export function isValidDate(dateString: string): boolean {
  // Check format YYYY-MM-DD
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) {
    return false;
  }

  // Check validity (e.g. 2023-02-30)
  // Date.parse('YYYY-MM-DD') parses as UTC
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return false;
  }

  // Check if the date string matches the date object (handles overflow like 2023-02-30 -> 2023-03-02)
  const [year, month, day] = dateString.split('-').map(Number);

  // Use UTC methods because YYYY-MM-DD is parsed as UTC midnight
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) {
    return false;
  }

  return true;
}
