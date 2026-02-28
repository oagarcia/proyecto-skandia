export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

const store = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(identifier: string, options: RateLimitOptions): { success: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const record = store.get(identifier);

  if (!record) {
    store.set(identifier, { count: 1, resetTime: now + options.windowMs });
    return { success: true, remaining: options.limit - 1, reset: now + options.windowMs };
  }

  // If the window has passed, reset the count
  if (now > record.resetTime) {
    store.set(identifier, { count: 1, resetTime: now + options.windowMs });
    return { success: true, remaining: options.limit - 1, reset: now + options.windowMs };
  }

  // If within the window, increment count
  if (record.count < options.limit) {
    record.count++;
    return { success: true, remaining: options.limit - record.count, reset: record.resetTime };
  }

  // Limit exceeded
  return { success: false, remaining: 0, reset: record.resetTime };
}

// Memory cleanup utility to prevent the map from growing indefinitely
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    if (now > value.resetTime) {
      store.delete(key);
    }
  }
}, 60000); // Clean up every minute

// Unref the interval so it doesn't keep the Node.js event loop alive indefinitely
if (cleanupInterval.unref) {
  cleanupInterval.unref();
}
