const fs = require('fs');
const path = require('path');
const { buildDirTree } = require('./src/tree');
const { renderHomePage } = require('./src/pages');

const HTML_DIR = path.join(__dirname, 'html');
const PROJECTS_FILE = path.join(HTML_DIR, 'projects.json');
const INDEX_FILE = path.join(HTML_DIR, 'index.html');

try {
  const projects = buildDirTree(HTML_DIR, '');
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2), 'utf-8');
  console.log(`✓ Generated projects.json with ${projects.length} top-level projects`);

  const indexHtml = renderHomePage(HTML_DIR);
  fs.writeFileSync(INDEX_FILE, indexHtml, 'utf-8');
  console.log(`✓ Generated index.html (pre-rendered home page)`);
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}