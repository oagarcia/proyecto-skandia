## 2025-02-17 - Prevent Information Disclosure via Error Messages
**Vulnerability:** Scraper functions (`fetchYahooFinanceDataForSymbols`, `fetchYahooDataWithBrowser`) were capturing raw `error.message` strings in catch blocks and embedding them directly into return strings. These strings are then used as context in LLM prompts.
**Learning:** Raw error messages from dependencies or environment failures can contain sensitive information like internal paths, database queries, stack traces, or configuration details. Leaking this directly into an LLM prompt (or back to a client) violates the principle of "Fail securely".
**Prevention:** Always replace detailed, raw internal error strings with generic, safe fallback messages (e.g., "An internal error occurred") before returning them across module or network boundaries, while maintaining raw logging via `console.error` for debugability.

## 2025-02-18 - Prevent Information Disclosure via Logged Response Buffers
**Vulnerability:** The `getPortfolioPdf` function in `src/lib/pdf-scraper.ts` logged raw response buffers (`buffer.slice(0, 100).toString()`) when the response did not match the expected PDF format.
**Learning:** Logging raw response buffers from external services can inadvertently capture sensitive data, internal paths, authentication tokens, or other restricted information, especially if the service returns an unexpected error page or API response instead of the expected file.
**Prevention:** Avoid logging raw response content, especially from external network requests, in production code. Rely on generic error logging and status codes instead to prevent accidental information disclosure.

## 2025-02-18 - Prevent Lock-out DoS in Rate Limiters via LRU Eviction
**Vulnerability:** The custom rate limiting logic in `src/lib/rate-limit.ts` protected its internal map from memory exhaustion DoS by refusing to track new IPs when `MAX_TRACKED_IPS` was reached (returning `false` to block the request). This created a secondary lock-out DoS vulnerability: an attacker could spoof IPs to quickly fill the map, permanently locking out all legitimate new users until the map's periodic cleanup ran.
**Learning:** When enforcing hard limits on tracking maps or caches for security reasons (like IP tracking), simply rejecting new entries creates a Denial of Service (DoS) vulnerability. The system must degrade gracefully.
**Prevention:** Always implement a Least Recently Used (LRU) eviction policy. When the map size limit is reached, evict the oldest entry to make room for the new one. Ensure that when existing entries are accessed/updated, they are deleted and re-inserted so they move to the end of the map (preserving LRU order). This prevents an attacker from permanently locking out legitimate users.
