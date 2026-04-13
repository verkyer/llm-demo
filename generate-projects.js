const fs = require('fs')
const path = require('path')

const HTML_DIR = path.join(__dirname, 'html')
const OUTPUT_FILE = path.join(__dirname, 'html', 'projects.json')

function hasIndexHtml(dirPath) {
  return fs.existsSync(path.join(dirPath, 'index.html'))
}

function scanDirectory(baseDir, relativePath = '') {
  const fullPath = path.join(baseDir, relativePath)
  const entries = fs.readdirSync(fullPath, { withFileTypes: true })

  const projects = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue

    const relPath = relativePath ? path.posix.join(relativePath, entry.name) : entry.name
    const childPath = path.join(baseDir, relPath)

    const children = scanDirectory(baseDir, relPath)

    projects.push({
      name: entry.name,
      rel: relPath,
      hasIndex: hasIndexHtml(childPath),
      children: children,
    })
  }

  return projects
}

try {
  const projects = scanDirectory(HTML_DIR)
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(projects, null, 2), 'utf-8')
  console.log(`✓ Generated projects.json with ${projects.length} top-level projects`)
} catch (error) {
  console.error('Error scanning directory:', error.message)
  process.exit(1)
}
