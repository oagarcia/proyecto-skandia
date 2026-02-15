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
