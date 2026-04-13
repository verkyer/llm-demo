const path = require('node:path');
const fs = require('node:fs');

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function toUrlPath(relPosixPath) {
  const parts = relPosixPath.split('/').filter(Boolean);
  return `/${parts.map(encodeURIComponent).join('/')}`;
}

function guessContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.js':
      return 'text/javascript; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.ico':
      return 'image/x-icon';
    case '.txt':
      return 'text/plain; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}

function send(res, statusCode, body, headers = {}) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
  res.writeHead(statusCode, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': buf.length,
    ...headers,
  });
  res.end(buf);
}

function send404(res) {
  send(res, 404, '<h1>404</h1>');
}

function send403(res) {
  send(res, 403, '<h1>403</h1>');
}

function send500(res, err) {
  send(
    res,
    500,
    `<h1>500</h1><pre>${escapeHtml(err && err.stack ? err.stack : String(err))}</pre>`
  );
}

function safeResolve(BASE_DIR, relUrlPath) {
  const fsPath = path.resolve(BASE_DIR, relUrlPath);
  const baseWithSep = BASE_DIR.endsWith(path.sep) ? BASE_DIR : BASE_DIR + path.sep;
  if (fsPath === BASE_DIR) return fsPath;
  if (!fsPath.startsWith(baseWithSep)) return null;
  return fsPath;
}

function readIndexTitle(absDir) {
  const indexPath = path.join(absDir, 'index.html');
  if (!fs.existsSync(indexPath)) return '';
  try {
    const html = fs.readFileSync(indexPath, 'utf8');
    const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (!m) return '';
    return m[1].replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
}

module.exports = {
  escapeHtml,
  toUrlPath,
  guessContentType,
  send,
  send404,
  send403,
  send500,
  safeResolve,
  readIndexTitle,
};