const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpeg':'image/jpeg','.jpg':'image/jpeg','.otf':'font/otf','.ttf':'font/ttf','.txt':'text/plain; charset=utf-8'};
function createServer() {
  return http.createServer(async (req,res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      let file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
      if (!file.startsWith(root + path.sep) && file !== root) {res.writeHead(403).end(); return;}
      if ((await fs.stat(file)).isDirectory()) {
        if (!url.pathname.endsWith('/')) {res.writeHead(301,{Location:url.pathname + '/' + url.search}).end(); return;}
        file = path.join(file, 'index.html');
      }
      const data = await fs.readFile(file);
      res.writeHead(200,{'Content-Type':types[path.extname(file).toLowerCase()] || 'application/octet-stream'}).end(data);
    } catch {res.writeHead(404).end('Not found');}
  });
}
if (require.main === module) createServer().listen(4173,'127.0.0.1', () => console.log('Site available at http://127.0.0.1:4173'));
module.exports = {createServer};
