const http = require('node:http');
const path = require('node:path');
const { createRouter } = require('./src/routes');

const PORT = Number(process.env.PORT || 3000);
const BASE_DIR = path.resolve(__dirname, 'html');

const handleRequest = createRouter(BASE_DIR);
const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  process.stdout.write(`Server running at http://localhost:${PORT}/\n`);
});