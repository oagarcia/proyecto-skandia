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

## 2025-02-18 - Prevent Secret Leakage via Query Strings and DoS via Missing Timeouts
**Vulnerability:** The `src/app/api/models/route.ts` endpoint passed the user's Google Generative AI API key in the URL query string (`?key=...`) to an external service. Additionally, external `fetch` calls lacked explicit timeouts.
**Learning:** Passing sensitive data (like API keys) in URL query parameters is a known vulnerability pattern (CWE-598). URLs are frequently logged by intermediate proxies, web servers, or cloud providers, risking exposure of the secret. Concurrently, missing timeouts on external API calls can lead to unbounded connection waits if the upstream is slow or unresponsive, leading to Denial of Service (DoS) via resource exhaustion.
**Prevention:** Always transmit secrets using encrypted HTTP headers (e.g., `x-goog-api-key` or `Authorization`) rather than query parameters. Additionally, always specify explicit timeouts (e.g., `AbortSignal.timeout(ms)`) on external network requests to fail fast and release resources securely.
