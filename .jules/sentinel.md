## 2025-02-19 - Debug Code in Production
**Vulnerability:** The `/api/analyze` endpoint contained debug code that listed all available Google AI models and returned raw internal error messages to the client upon failure.
**Learning:** Debug code used for development (fetching model lists) was left in the production path, exposing internal configuration and potentially sensitive error details (CWE-209).
**Prevention:** Always remove or strictly feature-flag debug logic. Use generic error messages for client responses while logging details securely on the server.
## 2025-05-23 - JS Date Validation Timezone Pitfall
**Vulnerability:** Inconsistent date validation logic leading to potential bypass or application errors.
**Learning:** JavaScript's `new Date('YYYY-MM-DD')` parses as UTC midnight. However, `date.getDate()` and other getters operate in the local system timezone. If the server runs in a timezone behind UTC (e.g., EST/COT), `2023-01-01` (UTC) becomes `2022-12-31` (Local), causing simple component comparison checks (year/month/day) to fail unexpectedly or behave inconsistently across environments.
**Prevention:** When validating strictly formatted date strings (like `YYYY-MM-DD`), always use UTC accessors (`getUTCFullYear`, `getUTCMonth`, `getUTCDate`) to ensure the components match the input string regardless of the server's timezone.
## 2025-05-24 - Unbounded String Inputs in LLM Prompts
**Vulnerability:** The application accepted unbounded string inputs (e.g., `portfolio.name`) which were directly injected into LLM prompts and logs. This posed a Denial of Service (DoS) risk via massive payloads and increased the surface area for Prompt Injection attacks.
**Learning:** Checking `typeof string` is insufficient for security. Malicious actors can send multi-megabyte strings to exhaust server memory or confuse AI models. Input validation must always include strict length limits and character allowlists where appropriate.
**Prevention:** Enforce `MAX_LENGTH` constants for all string inputs at the validation layer (`src/lib/validation.ts`) before any processing occurs. Validate format (e.g., regex) for specific fields like API keys.

## 2025-05-25 - Unvalidated External API Calls
**Vulnerability:** The `/api/models` endpoint accepted an `apiKey` from the client and used it directly in a `fetch` call to Google's API without validation or encoding. This exposed the application to potential parameter injection or malformed requests.
**Learning:** Even when calling trusted third-party APIs (like Google), input parameters must be treated as untrusted. Relying on the third-party to return an error is insufficient; the application must validate inputs *before* making the request to prevent abuse and ensure predictable behavior.
**Prevention:** Always validate and sanitize (e.g., `encodeURIComponent`) all user-provided data before using it in external API calls. Reuse existing validation logic (like `validateApiKey`) across all endpoints that consume similar data.

## 2025-05-25 - Unvalidated Model Selection in AI Endpoints
**Vulnerability:** The `/api/analyze` endpoint accepted a `model` parameter from the client without validation, allowing potential model injection or use of unsupported models.
**Learning:** When an API accepts a parameter that dictates critical behavior (like which AI model to use), relying on the backend library to catch errors is insufficient. This can lead to unpredictable behavior, higher costs (if a more expensive model is injected), or potential prompt injection vectors specific to certain models.
**Prevention:** Implement strict allowlists (`ALLOWED_MODELS`) for all configuration parameters that control external service behavior. Validate these parameters at the earliest entry point.

## 2025-05-26 - Prompt Injection via Unsanitized Portfolio Fields
**Vulnerability:** The `portfolio` fields (name, type, risk) were validated for length but not content, allowing attackers to inject newlines and malicious instructions into the LLM prompt.
**Learning:** Length limits are insufficient for LLM inputs. Attackers can use control characters (like newlines) to break out of the prompt context and override instructions.
**Prevention:** Implement strict regex validation for all text inputs destined for LLMs. Explicitly disallow newlines and control characters unless they are absolutely required and properly escaped.

## 2025-05-26 - Inconsistent Validation in Nested/Union Types
**Vulnerability:** The `portfolio.returns` (nested object) and `portfolio.value` (union type string|number) were not fully validated. `returns` fields lacked regex validation, and `value` lacked validation when it was a string, creating blind spots for prompt injection.
**Learning:** Validation logic must be recursively rigorous. If a field can be a string (even if union with number), it must be regex-validated. Nested objects must have their properties validated with the same strictness as top-level fields.
**Prevention:** Ensure all string paths in union types are validated against regex and length limits. Apply validation to all leaf nodes of nested objects.
