const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = Number(process.env.PORT || 3000);
const BASE_DIR = path.resolve(__dirname, 'html');

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

function safeResolve(relUrlPath) {
  const fsPath = path.resolve(BASE_DIR, relUrlPath);
  const baseWithSep = BASE_DIR.endsWith(path.sep) ? BASE_DIR : BASE_DIR + path.sep;
  if (fsPath === BASE_DIR) return fsPath;
  if (!fsPath.startsWith(baseWithSep)) return null;
  return fsPath;
}

function buildDirTree(relPosixDir = '') {
  const abs = relPosixDir ? path.join(BASE_DIR, ...relPosixDir.split('/')) : BASE_DIR;

  const entries = fs.readdirSync(abs, { withFileTypes: true });
  const dirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, 'zh-CN'));

  return dirs.map((name) => {
    const relChild = relPosixDir ? `${relPosixDir}/${name}` : name;
    const absChild = path.join(abs, name);
    const hasIndex = fs.existsSync(path.join(absChild, 'index.html'));
    const children = buildDirTree(relChild);
    return { name, rel: relChild, hasIndex, children };
  });
}

function renderTree(nodes) {
  if (!nodes.length) return '<p class="no-results" style="display:block">未发现可索引的子目录。</p>';
  
  const renderNodes = (list, depth) =>
    `<ul class="tree-root">
      ${list.map((n) => {
        const href = `${toUrlPath(n.rel)}/${n.hasIndex ? 'index.html' : ''}`;
        const title = escapeHtml(n.name);
        const isBranch = n.children && n.children.length > 0;
        const itemClass = isBranch ? 'tree-item branch' : 'tree-item leaf';
        
        // 如果是目录且无子项且无index，则不需要显示
        if (!isBranch && !n.hasIndex) {
            // 这里可以做一个判断：如果是纯空目录是否需要显示？
            // 按照之前的逻辑是显示的（浏览目录），但现在的需求弱化了浏览，更强调“项目”。
            // 假设我们认为只要是个文件夹就算项目，或者有index.html才算项目？
            // 暂时保持原样：所有目录都列出。
        }

        const icon = isBranch 
            ? `<svg class="icon-svg folder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`
            : `<svg class="icon-svg file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;

        if (isBranch) {
          return `
            <li class="${itemClass}" data-name="${title}">
              <div class="item-content branch-header">
                <span class="toggle-icon">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </span>
                <span class="icon-wrapper">${icon}</span>
                <span class="name">${title}</span>
                ${n.hasIndex ? `<a href="${href}" target="_blank" class="action-btn" title="在新窗口打开项目" onclick="event.stopPropagation()">打开</a>` : ''}
              </div>
              <div class="branch-content">
                ${renderNodes(n.children, depth + 1)}
              </div>
            </li>
          `;
        } else {
          return `
            <li class="${itemClass}" data-name="${title}">
              <a href="${href}" target="_blank" class="item-content link-item">
                <span class="icon-wrapper">${icon}</span>
                <span class="name">${title}</span>
                <span class="action-icon">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                </span>
              </a>
            </li>
          `;
        }
      }).join('')}
    </ul>`;

  return renderNodes(nodes, 0);
}

function renderHomePage() {
  const tree = buildDirTree('');
  const content = renderTree(tree);

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>HTML 项目演示</title>
    <style>
      :root {
        --bg-color: #f9fafb;
        --card-bg: #ffffff;
        --text-primary: #111827;
        --text-secondary: #6b7280;
        --accent-color: #000000;
        --accent-hover: #333333;
        --border-color: #e5e7eb;
        --hover-bg: #f3f4f6;
        --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      }
      
      * { box-sizing: border-box; }
      
      body {
        margin: 0;
        font-family: var(--font-sans);
        background-color: var(--bg-color);
        color: var(--text-primary);
        line-height: 1.5;
        -webkit-font-smoothing: antialiased;
      }

      .container {
        max-width: 900px;
        margin: 0 auto;
        padding: 4rem 1.5rem;
      }

      header {
        margin-bottom: 3rem;
        text-align: center;
      }

      h1 {
        font-size: 2.25rem;
        font-weight: 800;
        letter-spacing: -0.025em;
        margin: 0 0 1.5rem 0;
        color: var(--text-primary);
      }

      .search-wrapper {
        position: relative;
        max-width: 500px;
        margin: 0 auto;
      }

      .search-input {
        width: 100%;
        padding: 1rem 1.5rem 1rem 3rem;
        padding-right: 3.25rem;
        font-size: 1rem;
        border: 1px solid transparent;
        border-radius: 1rem;
        background: white;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
        transition: all 0.2s ease;
        outline: none;
        position: relative;
        z-index: 1;
      }

      .search-input:focus {
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025);
        transform: translateY(-1px);
      }
      
      .search-input::placeholder {
        color: #9ca3af;
      }

      .search-icon {
        position: absolute;
        left: 1rem;
        top: 50%;
        transform: translateY(-50%);
        color: #9ca3af;
        pointer-events: none;
        width: 1.25rem;
        height: 1.25rem;
        z-index: 2;
      }

      .clear-btn {
        position: absolute;
        right: 1rem;
        top: 50%;
        transform: translateY(-50%);
        width: 1.75rem;
        height: 1.75rem;
        border-radius: 0.6rem;
        border: 1px solid var(--border-color);
        background: #fff;
        color: var(--text-secondary);
        display: none;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 2;
        transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
      }

      .clear-btn:hover {
        background: var(--hover-bg);
        color: var(--text-primary);
        border-color: #d1d5db;
      }

      .card {
        background: transparent;
      }

      .tree-root {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .tree-item {
        margin-bottom: 0.5rem;
      }
      
      .item-content {
        display: flex;
        align-items: center;
        padding: 1rem 1.25rem;
        background: white;
        border: 1px solid var(--border-color);
        border-radius: 0.75rem;
        transition: all 0.2s ease;
        text-decoration: none;
        color: var(--text-primary);
        cursor: pointer;
        position: relative;
      }

      .item-content:hover {
        border-color: #d1d5db;
        box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        transform: translateY(-1px);
      }

      .branch-header {
        justify-content: flex-start;
      }

      .icon-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 0.75rem;
        color: var(--text-secondary);
        transition: color 0.2s;
      }
      
      .item-content:hover .icon-wrapper {
        color: var(--text-primary);
      }

      .icon-svg {
        width: 1.25rem;
        height: 1.25rem;
      }

      .name {
        font-weight: 500;
        font-size: 1rem;
        flex: 1;
      }

      .toggle-icon {
        margin-right: 0.5rem;
        color: #9ca3af;
        display: flex;
        align-items: center;
        transition: transform 0.2s ease;
      }

      .branch.open > .branch-header .toggle-icon {
        transform: rotate(90deg);
        color: var(--text-primary);
      }

      .branch-content {
        display: none;
        padding-left: 2rem;
        margin-top: 0.5rem;
        position: relative;
      }
      
      .branch-content::before {
        content: '';
        position: absolute;
        left: 1.6rem;
        top: 0;
        bottom: 1rem;
        width: 1px;
        background-color: var(--border-color);
      }

      .branch.open > .branch-content {
        display: block;
        animation: slideDown 0.2s ease-out;
      }

      .action-btn {
        padding: 0.4rem 1rem;
        font-size: 0.875rem;
        font-weight: 600;
        color: white;
        background-color: var(--accent-color);
        border-radius: 2rem;
        text-decoration: none;
        transition: all 0.2s;
        opacity: 0;
        transform: translateX(10px);
      }

      .item-content:hover .action-btn {
        opacity: 1;
        transform: translateX(0);
      }

      .action-btn:hover {
        background-color: var(--accent-hover);
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      
      .action-icon {
        opacity: 0;
        color: var(--text-secondary);
        transition: all 0.2s;
        transform: translateX(-5px);
      }
      
      .link-item:hover .action-icon {
        opacity: 1;
        transform: translateX(0);
      }

      .no-results {
        text-align: center;
        padding: 4rem 0;
        color: var(--text-secondary);
        font-size: 1.1rem;
        display: none;
      }

      .footer {
        margin-top: 6.5rem;
        text-align: center;
        color: rgba(107, 114, 128, 0.55);
        font-size: 0.85rem;
        padding-bottom: 2.5rem;
      }

      .footer a {
        color: inherit;
        text-decoration: none;
        font-weight: 500;
      }

      .footer a:hover {
        text-decoration: underline;
      }

      @keyframes slideDown {
        from { opacity: 0; transform: translateY(-5px); }
        to { opacity: 1; transform: translateY(0); }
      }

      [data-hidden="true"] { display: none !important; }
    </style>
  </head>
  <body>
    <div class="container">
      <header>
        <h1>HTML 项目演示</h1>
        <div class="search-wrapper">
            <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <input type="text" id="searchInput" class="search-input" placeholder="搜索项目..." autocomplete="off">
            <button type="button" id="clearSearch" class="clear-btn" aria-label="清除搜索">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>
      </header>

      <main class="card">
        <div id="treeContainer">
          ${content}
        </div>
        <div id="noResults" class="no-results">没有找到相关项目</div>
      </main>

      <footer class="footer">
        By <a href="https://github.com/verkyer/llm-demo" target="_blank" rel="noopener noreferrer">llm-demo</a>. @<a href="https://www.xiaoge.org" target="_blank" rel="noopener noreferrer">XiaoGe</a>.
      </footer>
    </div>

    <script>
      const searchInput = document.getElementById('searchInput');
      const clearSearch = document.getElementById('clearSearch');
      const treeItems = document.querySelectorAll('.tree-item');
      const noResults = document.getElementById('noResults');

      const updateClearVisibility = () => {
        const hasValue = searchInput.value.trim().length > 0;
        clearSearch.style.display = hasValue ? 'flex' : 'none';
      };

      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        let hasVisible = false;

        updateClearVisibility();

        treeItems.forEach(item => {
          const name = item.getAttribute('data-name').toLowerCase();
          const isMatch = name.includes(query);
          
          if (query === '') {
            item.setAttribute('data-hidden', 'false');
            hasVisible = true;
          } else {
            if (isMatch) {
              item.setAttribute('data-hidden', 'false');
              hasVisible = true;
              let parent = item.parentElement.closest('.branch');
              while (parent) {
                parent.classList.add('open');
                parent.setAttribute('data-hidden', 'false');
                parent = parent.parentElement.closest('.branch');
              }
            } else {
              item.setAttribute('data-hidden', 'true');
            }
          }
        });

        if (query !== '') {
          const branches = Array.from(document.querySelectorAll('.branch')).reverse();
          branches.forEach(branch => {
            const hasVisibleChild = branch.querySelector('.tree-item[data-hidden="false"]');
            if (hasVisibleChild) {
              branch.setAttribute('data-hidden', 'false');
              hasVisible = true;
            }
          });
        }

        noResults.style.display = hasVisible ? 'none' : 'block';
      });

      clearSearch.addEventListener('click', () => {
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        searchInput.focus();
      });

      updateClearVisibility();

      document.addEventListener('click', (e) => {
        const header = e.target.closest('.branch-header');
        if (header && !e.target.closest('.action-btn')) {
          const branch = header.parentElement;
          branch.classList.toggle('open');
        }
      });
    </script>
  </body>
</html>`;
}

function renderDirListing(relPosixDir, absDir) {
  const entries = fs.readdirSync(absDir, { withFileTypes: true });
  const dirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, 'zh-CN'));
  const files = entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, 'zh-CN'));

  const baseHref = relPosixDir ? `${toUrlPath(relPosixDir)}/` : '/';
  const parentRel = relPosixDir
    ? (() => {
        const p = path.posix.dirname(relPosixDir);
        return p === '.' ? '' : p;
      })()
    : '';

  const list = [
    relPosixDir
      ? `<li><a href="${toUrlPath(parentRel)}/">..</a></li>`
      : '',
    ...dirs.map((d) => `<li><a href="${baseHref}${encodeURIComponent(d)}/">${escapeHtml(d)}/</a></li>`),
    ...files.map((f) => `<li><a href="${baseHref}${encodeURIComponent(f)}">${escapeHtml(f)}</a></li>`),
  ]
    .filter(Boolean)
    .join('');

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(relPosixDir || 'html')}</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; margin: 24px; line-height: 1.6; }
      a { color: #0b57d0; text-decoration: none; }
      a:hover { text-decoration: underline; }
      ul { padding-left: 20px; }
      li { margin: 6px 0; }
      .meta { color: #666; margin-bottom: 12px; }
      code { background: #f5f5f5; padding: 2px 6px; border-radius: 6px; }
    </style>
  </head>
  <body>
    <div class="meta">目录：<code>${escapeHtml(path.join(BASE_DIR, ...relPosixDir.split('/').filter(Boolean)))}</code></div>
    <ul>${list}</ul>
  </body>
</html>`;
}

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

function handleRequest(req, res) {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Method Not Allowed');
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = decodeURIComponent(url.pathname || '/');

    if (pathname === '/') {
      const html = renderHomePage();
      if (req.method === 'HEAD') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end();
        return;
      }
      send(res, 200, html);
      return;
    }

    const relUrlPath = pathname.replace(/^\/+/, '');
    const absPath = safeResolve(relUrlPath);
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
      const html = renderDirListing(relPosixDir, absPath);
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
}

const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  process.stdout.write(`Server running at http://localhost:${PORT}/\n`);
});

