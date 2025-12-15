
const fs = require('fs');
const https = require('https');

const url = 'https://finance.yahoo.com/quote/CIB/';

const options = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
    }
};

https.get(url, options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        console.log(`Finished fetching. Status: ${res.statusCode}`);
        fs.writeFileSync('debug_cib.html', data);
        console.log('Saved to debug_cib.html');
    });
}).on('error', (err) => {
    console.error('Error:', err.message);
});
