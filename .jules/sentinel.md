## 2025-05-23 - JS Date Validation Timezone Pitfall
**Vulnerability:** Inconsistent date validation logic leading to potential bypass or application errors.
**Learning:** JavaScript's `new Date('YYYY-MM-DD')` parses as UTC midnight. However, `date.getDate()` and other getters operate in the local system timezone. If the server runs in a timezone behind UTC (e.g., EST/COT), `2023-01-01` (UTC) becomes `2022-12-31` (Local), causing simple component comparison checks (year/month/day) to fail unexpectedly or behave inconsistently across environments.
**Prevention:** When validating strictly formatted date strings (like `YYYY-MM-DD`), always use UTC accessors (`getUTCFullYear`, `getUTCMonth`, `getUTCDate`) to ensure the components match the input string regardless of the server's timezone.
