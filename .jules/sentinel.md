## 2025-05-15 - Input Validation in Scrapers
**Vulnerability:** Scrapers accepting raw user input for date ranges can lead to resource exhaustion or unexpected behavior.
**Learning:** Even when the full stack (Next.js, Puppeteer) cannot run in the CI/dev environment due to missing dependencies, extracting validation logic to pure functions allows for robust unit testing.
**Prevention:** Always validate and sanitize inputs before passing them to resource-intensive processes like browser automation.
