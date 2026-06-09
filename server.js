const express = require('express');
const { Pool } = require('pg');
const path    = require('path');
const https   = require('https');
const { verifyToken } = require('@clerk/backend');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── PostgreSQL ───────────────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pins (
      id            SERIAL PRIMARY KEY,
      user_id       TEXT NOT NULL,
      tiktok_url    TEXT NOT NULL,
      title         TEXT    DEFAULT '',
      thumbnail_url TEXT    DEFAULT '',
      author        TEXT    DEFAULT '',
      location_name TEXT NOT NULL,
      lat           REAL NOT NULL,
      lng           REAL NOT NULL,
      notes         TEXT    DEFAULT '',
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS pins_user_idx ON pins(user_id)`);
}

// ── Auth middleware ──────────────────────────────────────────────────────────
async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Unauthorized' });
  const token = header.replace('Bearer ', '');
  try {
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        ...headers,
      },
    }, (res) => {
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
  const patterns = [
    /"poi":\s*\{[^}]*"name"\s*:\s*"([^"]+)"/,
    /"locationCreated"\s*:\s*"([^"]+)"/,
    /"address"\s*:\s*"([^"]+)"/,
    /,"city"\s*:\s*"([^"]+)"/,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1] && m[1].length > 1) {
      return decodeURIComponent(
        m[1].replace(/\\u([\dA-Fa-f]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
      );
    }
  }
  return null;
}

app.use(express.json());

// Inject Clerk publishable key into the web app
app.get('/', (req, res) => {
  const html = require('fs').readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
  const key  = process.env.CLERK_PUBLISHABLE_KEY || 'pk_live_YOUR_KEY';
  res.send(html.replace('</head>', `<script>window.__CLERK_KEY__="${key}"</script></head>`));
});

app.use(express.static(path.join(__dirname, 'public')));

// ── TikTok oEmbed proxy (public) ─────────────────────────────────────────────
app.get('/api/tiktok-oembed', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });

  try {
    const [oembedBody, pageHtml] = await Promise.all([
      httpsGet(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`),
      httpsGet(url).catch(() => ''),
    ]);

    let title = '', thumbnail_url = '', author = '';
    try {
      const json = JSON.parse(oembedBody);
      title         = json.title         || '';
      thumbnail_url = json.thumbnail_url || '';
      author        = json.author_name   || '';
    } catch { /* oEmbed unavailable */ }

    res.json({ title, thumbnail_url, author, location: extractLocation(pageHtml) || null });
  } catch {
    res.status(502).json({ error: 'Failed to reach TikTok' });
  }
});

// ── Pins API (all routes require auth) ───────────────────────────────────────
app.get('/api/pins', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM pins WHERE user_id = $1 ORDER BY created_at DESC',
    [req.userId]
  );
  res.json(rows);
});

app.post('/api/pins', requireAuth, async (req, res) => {
  const { tiktok_url, title, thumbnail_url, author, location_name, lat, lng, notes } = req.body;
  if (!tiktok_url || !location_name || lat == null || lng == null) {
    return res.status(400).json({ error: 'tiktok_url, location_name, lat, and lng are required' });
  }
  const { rows } = await pool.query(
    `INSERT INTO pins (user_id, tiktok_url, title, thumbnail_url, author, location_name, lat, lng, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [req.userId, tiktok_url.trim(), title||'', thumbnail_url||'', author||'',
     location_name.trim(), lat, lng, notes||'']
  );
  res.status(201).json(rows[0]);
});

app.delete('/api/pins/:id', requireAuth, async (req, res) => {
  const { rowCount } = await pool.query(
    'DELETE FROM pins WHERE id = $1 AND user_id = $2',
    [req.params.id, req.userId]
  );
  if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

// ── Boot ─────────────────────────────────────────────────────────────────────
initDb()
  .then(() => app.listen(PORT, () => console.log(`TikTok Map running on port ${PORT}`)))
  .catch(err => { console.error('DB init failed:', err); process.exit(1); });
