
// Simple in-memory rate limiter with cleanup
// Note: This is a process-local implementation. In a distributed/serverless environment,
// a shared store like Redis would be required. For this application's scale, in-memory is sufficient.

const ipRequests = new Map<string, number[]>();

// Prevent memory exhaustion DoS attacks by capping tracked IPs
export const MAX_TRACKED_IPS = 10000;

// Cleanup interval (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
// Max retention time (1 hour) to safely cover the longest expected rate limit window
const MAX_RETENTION_MS = 60 * 60 * 1000;
let lastCleanup = Date.now();

/**
 * Removes IP entries that have no requests within the max retention window.
 * ensuring we don't prematurely delete data for long-window endpoints.
 */
function cleanup() {
    const now = Date.now();
    // Only run cleanup if enough time has passed
    if (now - lastCleanup < CLEANUP_INTERVAL) return;

    const retentionStart = now - MAX_RETENTION_MS;

    for (const [ip, timestamps] of ipRequests.entries()) {
        const validTimestamps = timestamps.filter(ts => ts > retentionStart);
        if (validTimestamps.length === 0) {
            ipRequests.delete(ip);
        } else {
            ipRequests.set(ip, validTimestamps);
        }
    }
    lastCleanup = now;
}

/**
 * Checks if an IP has exceeded the rate limit.
 * @param ip The IP address to check
 * @param limit Max requests allowed in the window
 * @param windowMs Time window in milliseconds
 * @returns true if allowed, false if limit exceeded
 */
/**
 * Securely extracts the client IP address from a request object.
 * Prefers x-real-ip to mitigate IP spoofing bypass via x-forwarded-for.
 * If x-real-ip is absent, takes the last IP in the X-Forwarded-For list.
 * Proxies append to the end, so the rightmost IP is the most trustworthy.
 * Taking the first IP allows attackers to spoof their IP by sending `X-Forwarded-For: fake-ip`.
 */
export function getClientIp(request: Request): string {
    const realIp = request.headers.get('x-real-ip');
    const forwardedFor = request.headers.get('x-forwarded-for');
    return realIp || (forwardedFor ? forwardedFor.split(',').pop()?.trim() || 'unknown' : 'unknown');
}

export function checkRateLimit(ip: string, limit: number = 5, windowMs: number = 60 * 1000): boolean {
    const now = Date.now();

    // Trigger lazy cleanup
    cleanup();

    const windowStart = now - windowMs;

    // Remove IP to re-insert it at the end of the Map (updating its LRU status)
    const timestamps = ipRequests.get(ip) || [];
    if (ipRequests.has(ip)) {
        ipRequests.delete(ip);
    }

    // Enforce memory limit to prevent memory exhaustion DoS via IP spoofing
    if (ipRequests.size >= MAX_TRACKED_IPS) {
        // 🛡️ SENTINEL: Evict the oldest IP to act as an LRU cache.
        // Returning false for all new IPs creates a lock-out DoS vulnerability.
        const oldestIp = ipRequests.keys().next().value;
        if (oldestIp) {
            ipRequests.delete(oldestIp);
        }
    }

    // Filter out old timestamps for this specific IP (immediate check for the current window)
    const validTimestamps = timestamps.filter(ts => ts > windowStart);

    if (validTimestamps.length >= limit) {
        // Still update the map with pruned timestamps to prevent array growth
        ipRequests.set(ip, validTimestamps);
        return false;
    }

    // Add current timestamp
    validTimestamps.push(now);
    ipRequests.set(ip, validTimestamps);

    return true;
}
