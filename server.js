const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT      = 8080;
const DATA_FILE = path.join(__dirname, 'data.json');
const HTML_FILE = path.join(__dirname, 'index.html');

function readItems() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return []; }
}

function writeItems(items) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2));
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { reject(e); } });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url      = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  try {
    // ── GET /api/items ──────────────────────────────────────────────
    if (pathname === '/api/items' && req.method === 'GET') {
      return json(res, 200, readItems());
    }

    // ── POST /api/items ─────────────────────────────────────────────
    if (pathname === '/api/items' && req.method === 'POST') {
      const item  = await readBody(req);
      const items = readItems();
      items.push(item);
      writeItems(items);
      return json(res, 201, item);
    }

    // ── PATCH /api/items/:id ─────────────────────────────────────────
    if (pathname.startsWith('/api/items/') && req.method === 'PATCH') {
      const id     = decodeURIComponent(pathname.slice('/api/items/'.length));
      const update = await readBody(req);
      const items  = readItems();
      const idx    = items.findIndex(i => i.id === id);
      if (idx === -1) return json(res, 404, { error: 'Not found' });
      items[idx] = { ...items[idx], ...update };
      writeItems(items);
      return json(res, 200, items[idx]);
    }

    // ── DELETE /api/items/:id ────────────────────────────────────────
    if (pathname.startsWith('/api/items/') && req.method === 'DELETE') {
      const id    = decodeURIComponent(pathname.slice('/api/items/'.length));
      let items   = readItems();
      const before = items.length;
      items = items.filter(i => i.id !== id);
      if (items.length === before) return json(res, 404, { error: 'Not found' });
      writeItems(items);
      return json(res, 200, { ok: true });
    }

    // ── Serve index.html ─────────────────────────────────────────────
    if (pathname === '/' || pathname === '/index.html') {
      const html = fs.readFileSync(HTML_FILE);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(html);
    }

    res.writeHead(404);
    res.end('Not found');

  } catch (err) {
    console.error(err);
    json(res, 500, { error: 'Internal server error' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Honeydew running at http://0.0.0.0:${PORT}`);
});
