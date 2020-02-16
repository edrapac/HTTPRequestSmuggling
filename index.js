const http = require('http');const server = http.createServer((req, res) => {
    if (req.method === 'POST') {
    	res.end('Hello,Friend\n');
    }
    else {
      res.end(`
        <!doctype html>
        <html>
        <body>
            <h1>These are not the droids you're looking for</h1>
        </body>
        </html>
      `);
    }
});server.listen(8080);