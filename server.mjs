import { createServer } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = normalize(fileURLToPath(new URL('.', import.meta.url)));
const publicDir = join(__dirname, 'public');
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const server = createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/register') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        if (!data.email || !data.password || String(data.password).length < 6) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Invalid input' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, user: { email: data.email } }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Bad JSON' }));
      }
    });
    return;
  }

  // Static files
  let path = req.url === '/' ? '/register.html' : req.url;
  path = normalize(path.split('?')[0]);
  const filePath = join(publicDir, path);
  if (!filePath.startsWith(publicDir) || !existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': mime[extname(filePath)] ?? 'text/plain; charset=utf-8' });
  createReadStream(filePath).pipe(res);
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
