const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();

    try {
        console.log('Navigating...');
        await page.goto('https://portal.skandia.com.co/om.rentabilidades.pl/oldmutual', { waitUntil: 'networkidle2' });

        // Expand first row
        console.log('Expanding row...');
        await page.waitForSelector('div[id^="numberOfRow"]');
        await page.click('div[id^="numberOfRow"]'); // Clicks first one

        // Wait for dropdown
        console.log('Waiting for dropdown...');
        await page.waitForSelector('#customDate', { visible: true });

        // Select first option
        console.log('Selecting option...');
        await page.select('#customDate', '0'); // Value 0

        // Setup listener for new target (tab)
        const newTargetPromise = new Promise(resolve => {
            browser.once('targetcreated', target => resolve(target));
        });

        // Setup listener for request (in case it's a download/request)
        page.on('request', req => {
            if (req.url().endsWith('.pdf') || req.resourceType() === 'other') {
                console.log('Potential PDF Request:', req.url());
            }
        });

        // Click PDF button
        console.log('Clicking PDF button...');
        await page.click('.PDFButton');

        // Wait for result
        const target = await newTargetPromise;
        const newPage = await target.page();
        if (newPage) {
            console.log('New Page URL:', newPage.url());
        } else {
            console.log('New Target created but no page (maybe download?)', target.url());
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
})();
