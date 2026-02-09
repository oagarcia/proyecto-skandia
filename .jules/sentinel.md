## 2024-05-22 - [Puppeteer Input Validation]
**Vulnerability:** Unvalidated user input (date range) passed directly to Puppeteer automation.
**Learning:** Browser automation is resource-intensive; allowing unvalidated input can lead to DoS or unexpected behavior in the headless browser.
**Prevention:** Strictly validate all inputs before launching a browser instance.
