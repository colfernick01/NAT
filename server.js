const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const DB_PATH = process.env.DB_PATH || 'addresses.db';
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,
    address TEXT NOT NULL,
    notes TEXT,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    added_by TEXT DEFAULT 'Anonymous',
    color TEXT DEFAULT '#e74c3c',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/addresses', (req, res) => {
  const rows = db.prepare('SELECT * FROM addresses ORDER BY created_at DESC').all();
  res.json(rows);
});

app.post('/api/addresses', (req, res) => {
  const { label, address, notes, lat, lng, added_by, color } = req.body;
  if (!label || !address || lat == null || lng == null) {
    return res.status(400).json({ error: 'label, address, lat, and lng are required' });
  }
  const stmt = db.prepare(
    'INSERT INTO addresses (label, address, notes, lat, lng, added_by, color) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const result = stmt.run(
    label.trim(),
    address.trim(),
    notes ? notes.trim() : '',
    lat,
    lng,
    added_by ? added_by.trim() : 'Anonymous',
    color || '#e74c3c'
  );
  const row = db.prepare('SELECT * FROM addresses WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(row);
});

app.delete('/api/addresses/:id', (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM addresses WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Polk County Map running at http://localhost:${PORT}`);
});
