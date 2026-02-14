## 2024-05-22 - Missing Input Validation on Analysis Endpoint
**Vulnerability:** The `src/app/api/analyze/route.ts` endpoint accepted a complex `portfolio` object without any validation, allowing potential DoS (oversized payloads) or injection attacks via unverified strings.
**Learning:** The project lacks a centralized validation library like Zod or Yup, necessitating manual, verbose validation logic in API handlers. Financial data fields (`value`, `returns`) are sometimes numbers and sometimes strings, requiring flexible type checking.
**Prevention:** Always implement rigorous input validation for all API endpoints. Use helper functions or a lightweight validation schema to ensure data integrity before processing.
