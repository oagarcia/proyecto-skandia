## 2024-05-23 - [High] Verbose Error Messages Leak Internal Details
**Vulnerability:** The `POST /api/analyze` endpoint returned full error messages, including stack traces and a list of available AI models, when an exception occurred.
**Learning:** Returning raw error objects or detailed debug info in production API responses can expose internal architecture and configuration to attackers.
**Prevention:** Always catch errors at the API boundary, log them securely server-side, and return generic error messages to the client.
