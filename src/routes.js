const fs = require('node:fs');
const path = require('node:path');
const {
  guessContentType,
  send,
  send404,
  send403,
  send500,
  safeResolve,
} = require('./utils');
const { buildDirTree } = require('./tree');
const { renderHomePage, renderDirListing } = require('./pages');

function serveFile(res, absPath) {
  const stat = fs.statSync(absPath);
  const type = guessContentType(absPath);

  res.writeHead(200, {
    'Content-Type': type,
    'Content-Length': stat.size,
    'Cache-Control': 'no-cache',
  });

  fs.createReadStream(absPath).pipe(res);
}

function createRouter(BASE_DIR) {
  return function handleRequest(req, res) {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Method Not Allowed');
        return;
      }

      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      const pathname = decodeURIComponent(url.pathname || '/');

      if (pathname === '/api/projects') {
        const tree = buildDirTree(BASE_DIR, '');
        const json = JSON.stringify(tree);
        if (req.method === 'HEAD') {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end();
          return;
        }
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': Buffer.byteLength(json),
          'Cache-Control': 'no-cache',
        });
        res.end(json);
        return;
      }

      if (pathname === '/') {
        const html = renderHomePage(BASE_DIR);
        if (req.method === 'HEAD') {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end();
          return;
        }
        send(res, 200, html);
        return;
      }

      const relUrlPath = pathname.replace(/^\/+/, '');
      const absPath = safeResolve(BASE_DIR, relUrlPath);
      if (!absPath) {
        send403(res);
        return;
      }

      if (!fs.existsSync(absPath)) {
        send404(res);
        return;
      }

      const stat = fs.statSync(absPath);
      if (stat.isDirectory()) {
        const indexPath = path.join(absPath, 'index.html');
        if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
          if (req.method === 'HEAD') {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end();
            return;
          }
          serveFile(res, indexPath);
          return;
        }

        const relPosixDir = relUrlPath.replaceAll('\\', '/').replace(/\/+$/, '');
        const html = renderDirListing(BASE_DIR, relPosixDir, absPath);
        if (req.method === 'HEAD') {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end();
          return;
        }
        send(res, 200, html);
        return;
      }

      if (req.method === 'HEAD') {
        res.writeHead(200, { 'Content-Type': guessContentType(absPath) });
        res.end();
        return;
      }
      serveFile(res, absPath);
    } catch (err) {
      send500(res, err);
    }
  };
}

module.exports = {
  createRouter,
};