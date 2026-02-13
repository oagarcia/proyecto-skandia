# Sentinel Journal - Critical Learnings

## 2025-02-18 - Input Validation for Date Parameters
**Vulnerability:** Missing input validation on date parameters in `src/app/api/skandia/route.ts`.
**Learning:** Even internal/headless browser interactions should validate inputs to prevent unexpected behavior and maintain robust error handling.
**Prevention:** Implement strict input validation using regex and logical checks (e.g. `to >= from`) before processing.
