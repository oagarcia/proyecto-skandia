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

  // Basic type checks
  if (typeof obj.type !== 'string') return { valid: false, error: 'Invalid type' };
  if (typeof obj.risk !== 'string') return { valid: false, error: 'Invalid risk' };

  if (typeof obj.value !== 'string' && typeof obj.value !== 'number') {
    return { valid: false, error: 'Invalid value: must be string or number' };
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
  }

  return { valid: true };
}
