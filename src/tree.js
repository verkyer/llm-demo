const fs = require('node:fs');
const path = require('node:path');
const { escapeHtml, toUrlPath, readIndexTitle } = require('./utils');

function buildDirTree(BASE_DIR, relPosixDir = '') {
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
    const indexTitle = hasIndex ? readIndexTitle(absChild) : '';
    const children = buildDirTree(BASE_DIR, relChild);
    return { name, rel: relChild, hasIndex, indexTitle, children };
  });
}

function renderTree(nodes) {
  if (!nodes.length) return '<p class="no-results" style="display:block">未发现可索引的子目录。</p>';

  const renderNodes = (list, depth) =>
    `<ul class="tree-root">
      ${list.map((n) => {
        const href = `${toUrlPath(n.rel)}/${n.hasIndex ? 'index.html' : ''}`;
        const title = escapeHtml(n.name);
        const indexTitle = escapeHtml(n.indexTitle || '');
        const searchText = escapeHtml(`${n.name} ${n.indexTitle || ''}`.trim());
        const isBranch = n.children && n.children.length > 0;
        const itemClass = isBranch ? 'tree-item branch' : 'tree-item leaf';

        const icon = isBranch
          ? `<svg class="icon-svg folder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`
          : `<svg class="icon-svg file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;

        if (isBranch) {
          return `
            <li class="${itemClass}" data-name="${searchText}">
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
            <li class="${itemClass}" data-name="${searchText}">
              <a href="${href}" target="_blank" class="item-content link-item">
                <span class="icon-wrapper">${icon}</span>
                <span class="name">${title}</span>
                ${indexTitle ? `<span class="page-title">${indexTitle}</span>` : ''}
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

module.exports = {
  buildDirTree,
  renderTree,
};