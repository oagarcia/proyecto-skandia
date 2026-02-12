## 2024-05-22 - Unvalidated Input in Scraper
**Vulnerability:** The `src/app/api/skandia/route.ts` endpoint accepted `from` and `to` query parameters without validation and passed them directly to a Puppeteer page context.
**Learning:** Even when `page.evaluate` serializes arguments (preventing direct XSS/Code Injection), passing unvalidated data can lead to application logic errors, potential DoS (if the target site hangs on bad data), or unexpected behavior.
**Prevention:** Implemented strict `YYYY-MM-DD` format validation and logical range checks (`from <= to`) before launching the browser.
