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

// Proxy TikTok oEmbed to avoid CORS
app.get('/api/tiktok-oembed', (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });

  const oembed = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
  https.get(oembed, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (upstream) => {
    let body = '';
    upstream.on('data', chunk => body += chunk);
    upstream.on('end', () => {
      try {
        const json = JSON.parse(body);
        res.json({
          title: json.title || '',
          thumbnail_url: json.thumbnail_url || '',
          author: json.author_name || '',
        });
      } catch {
        res.status(502).json({ error: 'Could not parse TikTok response' });
      }
    });
  }).on('error', () => res.status(502).json({ error: 'Failed to reach TikTok' }));
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
