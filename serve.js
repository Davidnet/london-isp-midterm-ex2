// Minimal static file server for local preview of the audio CAPTCHA.
// Serves the repo root so /app, /libraries and /fonts all resolve.
const http = require('http');
const fs = require('fs');
const path = require('path');

// Serve from the directory that contains this file (the repo root), so the
// server works on any clone / CI checkout — no machine-specific path.
const ROOT = __dirname;
const PORT = 5173;

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.ttf': 'font/ttf',
  '.json': 'application/json',
  '.wav': 'audio/wav',
  '.map': 'application/json',
  '.svg': 'image/svg+xml',
};

http
  .createServer((req, res) => {
    let urlPath;
    try {
      urlPath = decodeURIComponent(req.url.split('?')[0]);
    } catch {
      // Malformed percent-encoding would otherwise throw URIError and crash.
      res.writeHead(400);
      return res.end('Bad request');
    }
    // Redirect root to /app/ so the browser URL sits under /app/ and the page's
    // relative asset paths (css/, ../libraries/, ../../fonts/) resolve correctly.
    if (urlPath === '/') {
      res.writeHead(302, { Location: '/app/index.html' });
      return res.end();
    }
    // Resolve, then confirm the target is inside ROOT (a plain startsWith on the
    // prefix could be bypassed by a sibling dir that shares the prefix string).
    const filePath = path.join(ROOT, urlPath);
    if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        return res.end('Not found: ' + urlPath);
      }
      res.writeHead(200, {
        'Content-Type': TYPES[path.extname(filePath)] || 'application/octet-stream',
      });
      res.end(data);
    });
  })
  .listen(PORT, () => console.log('serving ' + ROOT + ' on http://localhost:' + PORT));
