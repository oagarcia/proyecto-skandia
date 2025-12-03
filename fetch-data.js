const fetch = require('node-fetch'); // might need to install or use built-in if node 18+

(async () => {
    try {
        const res = await fetch('http://localhost:3001/api/skandia');
        const json = await res.json();
        console.log(JSON.stringify(json, null, 2));
    } catch (e) {
        console.error(e);
    }
})();
