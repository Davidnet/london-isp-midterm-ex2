// Minimal static file server for local preview of the audio CAPTCHA.
// Serves the repo root so /app, /libraries and /fonts all resolve.
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = '/Users/davidcardozo/Documents/personal/uni/london-isp-midterm-ex2';
const PORT = 5173;

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.ttf': 'font/ttf', '.json': 'application/json', '.wav': 'audio/wav',
  '.map': 'application/json', '.svg': 'image/svg+xml'
};

http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  // Redirect root to /app/ so the browser URL sits under /app/ and the page's
  // relative asset paths (css/, ../libraries/, ../../fonts/) resolve correctly.
  if (urlPath === '/') { res.writeHead(302, { Location: '/app/index.html' }); return res.end(); }
  const filePath = path.join(ROOT, urlPath);
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found: ' + urlPath); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => console.log('serving ' + ROOT + ' on http://localhost:' + PORT));
