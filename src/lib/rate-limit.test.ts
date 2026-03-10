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

    it('should reject new IPs when max tracked limit is reached (DoS prevention)', () => {
        const limit = 5;
        const windowMs = 5000;

        // The previous tests added 4 unique IPs ('127.0.0.1', '127.0.0.2', '192.168.1.1', '192.168.1.2')
        // We need to add exactly enough to reach MAX_TRACKED_IPS without exceeding it initially.
        // It's safer to just clear the module state if possible or just use a loop that checks size.
        // However, we'll just add exactly MAX_TRACKED_IPS - 4 items.

        // We will just add new IPs until we get a rejection.
        let isRejected = false;

        // We try to add up to MAX_TRACKED_IPS + 10 to ensure we hit the limit
        for (let i = 0; i < MAX_TRACKED_IPS + 10; i++) {
            // Create dummy IP addresses (ensure they are unique from previous tests)
            const dummyIp = `10.100.${Math.floor(i / 256)}.${i % 256}`;

            const result = checkRateLimit(dummyIp, limit, windowMs);
            if (!result) {
                isRejected = true;
                break;
            }
        }

        // It should eventually reject new IPs because of the size limit
        expect(isRejected).toBe(true);

        // A known existing IP (e.g. '10.100.0.0') should still be allowed since it hasn't exceeded its rate limit
        expect(checkRateLimit('10.100.0.0', limit, windowMs)).toBe(true);
    });
});
