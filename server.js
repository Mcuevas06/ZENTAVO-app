const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3456;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  const safePath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const distCandidate = path.join(__dirname, 'dist', safePath);
  const publicCandidate = path.join(__dirname, 'public', safePath);
  const rootCandidate = path.join(__dirname, safePath);

  const filePath = fs.existsSync(distCandidate)
    ? distCandidate
    : fs.existsSync(publicCandidate)
    ? publicCandidate
    : rootCandidate;

  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Archivo no encontrado');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`Zentavo PWA corriendo en http://localhost:${PORT}`);
});
