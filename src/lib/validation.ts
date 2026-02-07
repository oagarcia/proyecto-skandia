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

export function validatePortfolio(data: unknown): { isValid: boolean; error?: string; portfolio?: Portfolio } {
    if (!data || typeof data !== 'object') {
        return { isValid: false, error: 'Portfolio data is missing or invalid' };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = data as any;
    const { name, type, risk, value, returns } = p;

    if (typeof name !== 'string' || name.trim() === '') {
        return { isValid: false, error: 'Invalid or missing portfolio name' };
    }

    if (typeof type !== 'string') {
        return { isValid: false, error: 'Invalid or missing portfolio type' };
    }

    if (typeof risk !== 'string') {
        return { isValid: false, error: 'Invalid or missing portfolio risk' };
    }

    // Value can be string or number
    if (typeof value !== 'string' && typeof value !== 'number') {
        return { isValid: false, error: 'Invalid or missing portfolio value' };
    }

    if (!returns || typeof returns !== 'object') {
        return { isValid: false, error: 'Invalid or missing portfolio returns' };
    }

    const requiredReturns = ['daily', 'monthly', 'sixMonths', 'yearly'];
    for (const key of requiredReturns) {
        if (typeof returns[key] !== 'string') {
            return { isValid: false, error: `Invalid return value for ${key}` };
        }
    }

    return { isValid: true, portfolio: p as Portfolio };
}
