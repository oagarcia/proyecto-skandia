const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://portal.skandia.com.co/om.rentabilidades.pl/oldmutual');

    // Wait for initial load
    await new Promise(r => setTimeout(r, 2000));

    // Set dates and click calculate
    await page.type('#datepickerFrom', '2025-11-01');
    await page.type('#datepickerTo', '2025-12-01');

    // Click calculate
    // Try to find the button
    const buttons = await page.$$('button');
    for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text.includes('CALCULAR')) {
            await btn.click();
            break;
        }
    }

    await new Promise(r => setTimeout(r, 3000));

    // Dump the HTML of the main container
    const content = await page.evaluate(() => {
        // Try to find the container with results
        // The browser subagent mentioned "Portafolios Abiertos"
        return document.body.innerHTML;
    });

    console.log(content);

    await browser.close();
})();
