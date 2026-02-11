## 2024-05-23 - Input Validation for Scrapers
**Vulnerability:** Unvalidated input parameters (`from`, `to`) in `src/app/api/skandia/route.ts` were passed directly to `puppeteer` context. While `page.evaluate` serializes arguments preventing direct XSS/injection in Node context, it allows arbitrary strings to be injected into the target page's DOM via the scraper.
**Learning:** Even internal API endpoints triggered by frontend should validate inputs. Headless browsers are powerful but can be manipulated if inputs controlling them are not strict.
**Prevention:** Implement strict input validation (e.g., regex for dates, logical range checks) for all parameters controlling scraper behavior.
