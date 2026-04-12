const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'englishfun.db'));

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    avatar TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS user_data (
    profile_id TEXT PRIMARY KEY,
    data TEXT NOT NULL DEFAULT '{}',
    updated_at INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
  );
`);

const stmts = {
  getProfiles: db.prepare('SELECT * FROM profiles ORDER BY created_at'),
  getProfile: db.prepare('SELECT * FROM profiles WHERE id = ?'),
  createProfile: db.prepare('INSERT INTO profiles (id, name, avatar) VALUES (?, ?, ?)'),
  deleteProfile: db.prepare('DELETE FROM profiles WHERE id = ?'),

  getData: db.prepare('SELECT data FROM user_data WHERE profile_id = ?'),
  upsertData: db.prepare(`
    INSERT INTO user_data (profile_id, data, updated_at)
    VALUES (?, ?, strftime('%s','now'))
    ON CONFLICT(profile_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
  `),
  deleteData: db.prepare('DELETE FROM user_data WHERE profile_id = ?'),
};

module.exports = { db, stmts };
