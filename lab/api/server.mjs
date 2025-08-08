import { createServer } from 'node:http';
import { existsSync, mkdirSync } from 'node:fs';
import { createReadStream } from 'node:fs';
import { writeFile, stat } from 'node:fs/promises';
import { extname, join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeForm, runFormTests } from '../runner/formRunner.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WEB_DIR = join(__dirname, '../web');
const ART_DIR = join(__dirname, '../artifacts');
const PORT = process.env.LAB_PORT ? Number(process.env.LAB_PORT) : 4000;

if (!existsSync(ART_DIR)) mkdirSync(ART_DIR, { recursive: true });

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

const server = createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  try {
    if (req.method === 'POST' && req.url === '/api/analyze') {
      const body = await readBody(req);
      const url = body?.url;
      if (!url || !/^https?:\/\//i.test(url)) return sendJson(res, 400, { error: 'Provide http/https URL' });
      const summary = await analyzeForm({ url });
      return sendJson(res, 200, { ok: true, summary });
    }

    if (req.method === 'POST' && req.url === '/api/run') {
      const body = await readBody(req);
      const url = body?.url;
      const options = body?.options ?? {};
      if (!url || !/^https?:\/\//i.test(url)) return sendJson(res, 400, { error: 'Provide http/https URL' });
      const tsDir = await makeTsDir();
      const result = await runFormTests({ url, outDir: tsDir, options });
      await writeFile(join(tsDir, 'summary.json'), JSON.stringify(result, null, 2), 'utf8');
      return sendJson(res, 200, { ok: true, ...result, artifactDir: relArtifacts(tsDir) });
    }

    // Serve artifacts
    if (req.method === 'GET' && req.url.startsWith('/artifacts/')) {
      const filePath = join(__dirname, '..', req.url);
      try {
        await stat(filePath);
      } catch {
        res.writeHead(404).end('Not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': mime[extname(filePath)] ?? 'application/octet-stream', 'Access-Control-Allow-Origin': '*' });
      createReadStream(filePath).pipe(res);
      return;
    }

    // Static web UI
    if (req.method === 'GET') {
      const path = req.url === '/' ? '/index.html' : req.url;
      const filePath = join(WEB_DIR, path.split('?')[0]);
      try {
        await stat(filePath);
        res.writeHead(200, { 'Content-Type': mime[extname(filePath)] ?? 'text/plain; charset=utf-8' });
        createReadStream(filePath).pipe(res);
      } catch {
        res.writeHead(404).end('Not found');
      }
      return;
    }

    res.writeHead(404).end('Not found');
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: String(err?.message || err) });
  }
});

server.listen(PORT, () => {
  console.log(`Lab server at http://localhost:${PORT}`);
});

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

async function makeTsDir() {
  const folder = String(Date.now());
  const p = join(ART_DIR, folder);
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
  return p;
}

function relArtifacts(abs) {
  try {
    const rel = relative(ART_DIR, abs); // e.g., '1721231234' or '172.../trace.zip'
    return `/artifacts/${rel}`;
  } catch {
    return abs;
  }
}
