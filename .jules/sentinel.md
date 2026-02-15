## 2025-02-19 - Debug Code in Production
**Vulnerability:** The `/api/analyze` endpoint contained debug code that listed all available Google AI models and returned raw internal error messages to the client upon failure.
**Learning:** Debug code used for development (fetching model lists) was left in the production path, exposing internal configuration and potentially sensitive error details (CWE-209).
**Prevention:** Always remove or strictly feature-flag debug logic. Use generic error messages for client responses while logging details securely on the server.
## 2025-05-23 - JS Date Validation Timezone Pitfall
**Vulnerability:** Inconsistent date validation logic leading to potential bypass or application errors.
**Learning:** JavaScript's `new Date('YYYY-MM-DD')` parses as UTC midnight. However, `date.getDate()` and other getters operate in the local system timezone. If the server runs in a timezone behind UTC (e.g., EST/COT), `2023-01-01` (UTC) becomes `2022-12-31` (Local), causing simple component comparison checks (year/month/day) to fail unexpectedly or behave inconsistently across environments.
**Prevention:** When validating strictly formatted date strings (like `YYYY-MM-DD`), always use UTC accessors (`getUTCFullYear`, `getUTCMonth`, `getUTCDate`) to ensure the components match the input string regardless of the server's timezone.
