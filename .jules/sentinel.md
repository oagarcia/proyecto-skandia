## 2025-02-17 - Prevent Information Disclosure via Error Messages
**Vulnerability:** Scraper functions (`fetchYahooFinanceDataForSymbols`, `fetchYahooDataWithBrowser`) were capturing raw `error.message` strings in catch blocks and embedding them directly into return strings. These strings are then used as context in LLM prompts.
**Learning:** Raw error messages from dependencies or environment failures can contain sensitive information like internal paths, database queries, stack traces, or configuration details. Leaking this directly into an LLM prompt (or back to a client) violates the principle of "Fail securely".
**Prevention:** Always replace detailed, raw internal error strings with generic, safe fallback messages (e.g., "An internal error occurred") before returning them across module or network boundaries, while maintaining raw logging via `console.error` for debugability.

## 2025-02-18 - Prevent Information Disclosure via Logged Response Buffers
**Vulnerability:** The `getPortfolioPdf` function in `src/lib/pdf-scraper.ts` logged raw response buffers (`buffer.slice(0, 100).toString()`) when the response did not match the expected PDF format.
**Learning:** Logging raw response buffers from external services can inadvertently capture sensitive data, internal paths, authentication tokens, or other restricted information, especially if the service returns an unexpected error page or API response instead of the expected file.
**Prevention:** Avoid logging raw response content, especially from external network requests, in production code. Rely on generic error logging and status codes instead to prevent accidental information disclosure.

## 2025-02-18 - Prevent Lock-out DoS in In-Memory Cache
**Vulnerability:** The in-memory rate limiting implementation in `src/lib/rate-limit.ts` protected its map size (`MAX_TRACKED_IPS`) by refusing to track new IPs. If an attacker spoofed requests from `MAX_TRACKED_IPS` IPs, the map would fill up and permanently block all new requests, creating a Denial of Service.
**Learning:** Naive size limits on memory structures can be weaponized. "Protecting memory" by dropping valid traffic is the definition of a lock-out DoS. The cache size must be managed safely without denying service.
**Prevention:** Implement Least Recently Used (LRU) eviction for in-memory IP tracking maps to ensure new legitimate traffic is always admitted while old traffic is purged when memory limits are reached.

## 2024-03-31 - [API Key Leakage and Missing Timeouts]
**Vulnerability:** Google Generative AI API key was sent via URL query parameter in `src/app/api/models/route.ts` (CWE-598). Missing timeouts in Node.js `fetch` calls.
**Learning:** External API dependencies were integrated quickly without considering logging implications of URLs or the risk of hanging upstream connections (DoS).
**Prevention:** Always pass credentials via designated HTTP headers (e.g., `x-goog-api-key`, `Authorization`). Enforce `AbortSignal.timeout()` on all server-to-server HTTP requests.

## 2024-04-06 - Prevent XSS in ReactMarkdown Custom Components
**Vulnerability:** Untrusted text rendered via `react-markdown` passed arbitrary `href` attributes directly to a custom `<a>` component without sanitization, allowing XSS via `javascript:` URIs.
**Learning:** While `react-markdown` natively prevents XSS in its default rendering, overriding components with custom props (e.g., `components={{ a: ({...props}) => <a {...props}>...</a> }}`) bypasses internal sanitization.
**Prevention:** Always explicitly validate and sanitize attributes like `href` or `src` when creating custom overrides in markdown renderers. Use the native `URL` constructor to verify protocols against an allowlist (e.g., `['http:', 'https:', 'mailto:', 'tel:']`).

## 2024-04-10 - Prevent Rate-Limit Bypass via IP Spoofing
**Vulnerability:** The application's rate limiting logic blindly trusted the first IP address in the `x-forwarded-for` header (`forwardedFor.split(',')[0]`). This allowed attackers to bypass rate limits by explicitly providing an `x-forwarded-for` header with a spoofed or rotating IP address.
**Learning:** In typical reverse proxy setups, the proxy appends the real client IP to the end of the `x-forwarded-for` list. Trusting the first IP leaves the system vulnerable to spoofing.
**Prevention:** To securely extract the real client IP when operating behind a trusted proxy, always parse the last IP in the `x-forwarded-for` chain (e.g., using `.pop()`), assuming `x-real-ip` is not available.
