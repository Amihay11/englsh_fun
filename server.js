const express = require('express');
const path = require('path');
const { db, stmts } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Profile API ──

app.get('/api/profiles', (req, res) => {
  const profiles = stmts.getProfiles.all();
  res.json(profiles);
});

app.post('/api/profiles', (req, res) => {
  const { name, avatar } = req.body;
  if (!name || !avatar) return res.status(400).json({ error: 'name and avatar required' });
  const id = 'u' + Date.now();
  stmts.createProfile.run(id, name, avatar);
  stmts.upsertData.run(id, '{}');
  res.json({ id, name, avatar });
});

app.delete('/api/profiles/:id', (req, res) => {
  const { id } = req.params;
  stmts.deleteData.run(id);
  stmts.deleteProfile.run(id);
  res.json({ ok: true });
});

// ── User Data API ──

app.get('/api/data/:profileId', (req, res) => {
  const row = stmts.getData.get(req.params.profileId);
  if (!row) return res.json({});
  try {
    res.json(JSON.parse(row.data));
  } catch {
    res.json({});
  }
});

app.put('/api/data/:profileId', (req, res) => {
  const data = JSON.stringify(req.body);
  stmts.upsertData.run(req.params.profileId, data);
  res.json({ ok: true });
});

// ── Serve frontend ──

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`English Fun server running at http://localhost:${PORT}`);
});
