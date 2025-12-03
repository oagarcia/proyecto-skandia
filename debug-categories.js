const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    console.log('Navigating...');
    await page.goto('https://portal.skandia.com.co/om.rentabilidades.pl/oldmutual', {
        waitUntil: 'networkidle2',
        timeout: 60000
    });

    // 1. Find and click "Variación Unidad" radio button
    // Need to find the selector. Based on common practices, it might be an input[type="radio"].
    // I'll dump the initial HTML first to find the selector if I can't guess it.
    // But I'll try to find it by text or label if possible.

    console.log('Initial Page Loaded. Dumping initial HTML for inspection...');
    const initialHtml = await page.content();
    fs.writeFileSync('debug_initial.html', initialHtml);

    // Try to find the radio button. The user said "Variación Unidad".
    // It might be a label or an input.
    // Let's try to click the element containing that text.
    try {
        const radioBtn = await page.$x("//label[contains(text(), 'Variación Unidad')] | //input[@type='radio' and following-sibling::text()[contains(., 'Variación Unidad')]]");
        if (radioBtn.length > 0) {
            console.log('Found "Variación Unidad" element. Clicking...');
            await radioBtn[0].click();
            // Wait for update
            await new Promise(r => setTimeout(r, 5000));
        } else {
            console.log('Could not find "Variación Unidad" by XPath. Trying generic search...');
        }
    } catch (e) {
        console.error('Error clicking radio:', e);
    }

    // 2. Set dates and Calculate (Standard flow)
    await page.evaluate(() => {
        const date = new Date();
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const formatDate = (d) => {
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}/${month}/${year}`;
        };

        // @ts-ignore
        document.getElementById('datepickerFrom').value = formatDate(firstDay);
        // @ts-ignore
        document.getElementById('datepickerTo').value = formatDate(lastDay);
    });

    console.log('Clicking Calculate...');
    try {
        await page.waitForSelector('.calcularButton', { timeout: 5000 });
        await page.click('.calcularButton');
        await new Promise(r => setTimeout(r, 5000)); // Wait for data
    } catch (e) {
        console.log('Calculate click failed', e);
    }

    console.log('Dumping final HTML...');
    const finalHtml = await page.content();
    fs.writeFileSync('debug_final_variation.html', finalHtml);

    await browser.close();
})();
