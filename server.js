const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || 'tiktok_map.db';

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS pins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tiktok_url TEXT NOT NULL,
    title TEXT,
    thumbnail_url TEXT,
    author TEXT,
    location_name TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15', ...headers } }, (res) => {
      // follow one redirect
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        return httpsGet(res.headers.location, headers).then(resolve).catch(reject);
      }
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(body));
    }).on('error', reject);
  });
}

function extractLocation(html) {
  // TikTok embeds a JSON blob — try several known field patterns for POI/location
  const patterns = [
    /"poi":\s*\{[^}]*"name"\s*:\s*"([^"]+)"/,
    /"locationCreated"\s*:\s*"([^"]+)"/,
    /"address"\s*:\s*"([^"]+)"/,
    /,"city"\s*:\s*"([^"]+)"/,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1] && m[1].length > 1) return decodeURIComponent(m[1].replace(/\\u([\dA-Fa-f]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))));
  }
  return null;
}

// Proxy TikTok oEmbed + attempt location extraction
app.get('/api/tiktok-oembed', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });

  try {
    // Fetch oEmbed and page HTML in parallel
    const [oembedBody, pageHtml] = await Promise.all([
      httpsGet(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`),
      httpsGet(url).catch(() => ''),
    ]);

    let title = '', thumbnail_url = '', author = '';
    try {
      const json = JSON.parse(oembedBody);
      title         = json.title        || '';
      thumbnail_url = json.thumbnail_url || '';
      author        = json.author_name   || '';
    } catch { /* oEmbed failed, continue with page data */ }

    const location = extractLocation(pageHtml);

    res.json({ title, thumbnail_url, author, location: location || null });
  } catch {
    res.status(502).json({ error: 'Failed to reach TikTok' });
  }
});

app.get('/api/pins', (req, res) => {
  const rows = db.prepare('SELECT * FROM pins ORDER BY created_at DESC').all();
  res.json(rows);
});

app.post('/api/pins', (req, res) => {
  const { tiktok_url, title, thumbnail_url, author, location_name, lat, lng, notes } = req.body;
  if (!tiktok_url || !location_name || lat == null || lng == null) {
    return res.status(400).json({ error: 'tiktok_url, location_name, lat, and lng are required' });
  }
  const stmt = db.prepare(
    'INSERT INTO pins (tiktok_url, title, thumbnail_url, author, location_name, lat, lng, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const result = stmt.run(
    tiktok_url.trim(), title || '', thumbnail_url || '', author || '',
    location_name.trim(), lat, lng, notes ? notes.trim() : ''
  );
  const row = db.prepare('SELECT * FROM pins WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(row);
});

app.delete('/api/pins/:id', (req, res) => {
  const result = db.prepare('DELETE FROM pins WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`TikTok Map running at http://localhost:${PORT}`));
