import { describe, it, expect } from 'vitest';
import { checkRateLimit, MAX_TRACKED_IPS } from './rate-limit';

describe('Rate Limiter', () => {
    it('should allow requests within the limit', () => {
        const ip = '127.0.0.1';
        const limit = 3;
        const windowMs = 5000;

        expect(checkRateLimit(ip, limit, windowMs)).toBe(true);
        expect(checkRateLimit(ip, limit, windowMs)).toBe(true);
        expect(checkRateLimit(ip, limit, windowMs)).toBe(true);
    });

    it('should block requests exceeding the limit', () => {
        const ip = '127.0.0.1'; // Same IP as above, continuing the count
        const limit = 3;
        const windowMs = 5000;

        // The previous test already consumed 3 requests.
        // However, tests might run in parallel or shared state if module is cached.
        // To be safe, let's use a fresh IP for this test.
        const freshIp = '127.0.0.2';

        expect(checkRateLimit(freshIp, limit, windowMs)).toBe(true);
        expect(checkRateLimit(freshIp, limit, windowMs)).toBe(true);
        expect(checkRateLimit(freshIp, limit, windowMs)).toBe(true);

        // Now it should block
        expect(checkRateLimit(freshIp, limit, windowMs)).toBe(false);
        expect(checkRateLimit(freshIp, limit, windowMs)).toBe(false);
    });

    it('should track different IPs independently', () => {
        const limit = 2;
        const windowMs = 5000;
        const ip1 = '192.168.1.1';
        const ip2 = '192.168.1.2';

        // Fill up IP1
        checkRateLimit(ip1, limit, windowMs);
        checkRateLimit(ip1, limit, windowMs);
        expect(checkRateLimit(ip1, limit, windowMs)).toBe(false);

        // IP2 should still be free
        expect(checkRateLimit(ip2, limit, windowMs)).toBe(true);
    });

    it('should enforce MAX_TRACKED_IPS to prevent memory exhaustion', () => {
        const limit = 5;
        const windowMs = 5000;

        // Exhaust the rate limit for the first IP
        for (let j = 0; j < limit; j++) {
            expect(checkRateLimit(`test-ip-0`, limit, windowMs)).toBe(true);
        }
        expect(checkRateLimit(`test-ip-0`, limit, windowMs)).toBe(false);

        // Track the remaining IPs up to MAX_TRACKED_IPS
        for (let i = 1; i < MAX_TRACKED_IPS; i++) {
            checkRateLimit(`test-ip-${i}`, limit, windowMs);
        }

        // Add one more IP, causing the first one (`test-ip-0`) to be evicted
        checkRateLimit(`test-ip-${MAX_TRACKED_IPS}`, limit, windowMs);

        // `test-ip-0` was evicted. Its rate limit history is gone, so a new request from it should be allowed.
        expect(checkRateLimit(`test-ip-0`, limit, windowMs)).toBe(true);
    });
});
