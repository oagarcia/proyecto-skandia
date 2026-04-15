// @spec src/specs/lib/rate-limit.spec.md
import { describe, it, expect } from 'vitest';
import { checkRateLimit, getClientIp, MAX_TRACKED_IPS } from './rate-limit';

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

describe('getClientIp', () => {
    const makeRequest = (headers: Record<string, string>) =>
        new Request('http://localhost/', { headers });

    it('should prefer x-real-ip over x-forwarded-for', () => {
        const req = makeRequest({
            'x-real-ip': '10.0.0.1',
            'x-forwarded-for': '1.2.3.4, 5.6.7.8',
        });
        expect(getClientIp(req)).toBe('10.0.0.1');
    });

    it('should take the last IP in x-forwarded-for list (anti-spoofing)', () => {
        // The first IP can be spoofed by the attacker; the last is added by the trusted proxy.
        const req = makeRequest({
            'x-forwarded-for': 'spoofed-ip, real-proxy-ip, 203.0.113.42',
        });
        expect(getClientIp(req)).toBe('203.0.113.42');
    });

    it('should return "unknown" when no IP headers are present', () => {
        const req = makeRequest({});
        expect(getClientIp(req)).toBe('unknown');
    });

    it('should handle a single IP in x-forwarded-for', () => {
        const req = makeRequest({ 'x-forwarded-for': '192.168.1.100' });
        expect(getClientIp(req)).toBe('192.168.1.100');
    });
});
