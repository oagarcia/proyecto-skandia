## 2025-02-19 - Debug Code in Production
**Vulnerability:** The `/api/analyze` endpoint contained debug code that listed all available Google AI models and returned raw internal error messages to the client upon failure.
**Learning:** Debug code used for development (fetching model lists) was left in the production path, exposing internal configuration and potentially sensitive error details (CWE-209).
**Prevention:** Always remove or strictly feature-flag debug logic. Use generic error messages for client responses while logging details securely on the server.
