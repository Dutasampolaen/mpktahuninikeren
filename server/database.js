const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'mpk.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

function initDatabase() {
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      nis TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      class TEXT NOT NULL,
      commission_id TEXT,
      roles TEXT DEFAULT '["member"]',
      is_active INTEGER DEFAULT 1,
      total_assigned_programs INTEGER DEFAULT 0,
      total_assigned_roles TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (commission_id) REFERENCES commissions(id)
    );

    CREATE TABLE IF NOT EXISTS commissions (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS programs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      proposer_id TEXT,
      status TEXT DEFAULT 'draft',
      start_datetime TEXT NOT NULL,
      end_datetime TEXT NOT NULL,
      preparation_days_before INTEGER DEFAULT 0,
      cleanup_days_after INTEGER DEFAULT 0,
      target_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (proposer_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS panitia_assignments (
      id TEXT PRIMARY KEY,
      program_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      commission_id TEXT NOT NULL,
      is_required_role INTEGER DEFAULT 0,
      is_locked INTEGER DEFAULT 0,
      batch_id TEXT,
      revision_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (program_id) REFERENCES programs(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (commission_id) REFERENCES commissions(id)
    );

    CREATE TABLE IF NOT EXISTS scoring_rubrics (
      id TEXT PRIMARY KEY,
      program_type TEXT NOT NULL,
      standard_code TEXT NOT NULL,
      description TEXT NOT NULL,
      max_score INTEGER NOT NULL CHECK (max_score > 0),
      weight REAL NOT NULL CHECK (weight >= 0 AND weight <= 100),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS scores (
      id TEXT PRIMARY KEY,
      program_id TEXT NOT NULL,
      grader_id TEXT NOT NULL,
      standard_code TEXT NOT NULL,
      score_value REAL NOT NULL CHECK (score_value >= 0),
      comment TEXT,
      is_draft INTEGER DEFAULT 1,
      is_final INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (program_id) REFERENCES programs(id),
      FOREIGN KEY (grader_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS program_types (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS program_categories (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      severity TEXT DEFAULT 'info',
      is_read INTEGER DEFAULT 0,
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_nis ON users(nis);
    CREATE INDEX IF NOT EXISTS idx_programs_status ON programs(status);
    CREATE INDEX IF NOT EXISTS idx_panitia_program ON panitia_assignments(program_id);
    CREATE INDEX IF NOT EXISTS idx_panitia_user ON panitia_assignments(user_id);
    CREATE INDEX IF NOT EXISTS idx_scores_program ON scores(program_id);
  `;

  db.exec(schema);

  seedInitialData();
}

function seedInitialData() {
  const commissions = [
    { id: 'comm-a', name: 'Komisi A', description: 'Komisi A' },
    { id: 'comm-b', name: 'Komisi B', description: 'Komisi B' },
    { id: 'comm-c', name: 'Komisi C', description: 'Komisi C' },
    { id: 'sekbid-1', name: 'Sekbid 1', description: 'Sekbid 1' },
    { id: 'sekbid-2', name: 'Sekbid 2', description: 'Sekbid 2' },
    { id: 'sekbid-3', name: 'Sekbid 3', description: 'Sekbid 3' },
    { id: 'sekbid-4', name: 'Sekbid 4', description: 'Sekbid 4' },
    { id: 'sekbid-5', name: 'Sekbid 5', description: 'Sekbid 5' },
    { id: 'sekbid-6', name: 'Sekbid 6', description: 'Sekbid 6' },
    { id: 'sekbid-7', name: 'Sekbid 7', description: 'Sekbid 7' },
    { id: 'sekbid-8', name: 'Sekbid 8', description: 'Sekbid 8' },
    { id: 'sekbid-9', name: 'Sekbid 9', description: 'Sekbid 9' }
  ];

  const insertCommission = db.prepare('INSERT OR IGNORE INTO commissions (id, name, description) VALUES (?, ?, ?)');
  commissions.forEach(c => insertCommission.run(c.id, c.name, c.description));

  const programTypes = [
    { id: 'type-kb', name: 'kegiatan_besar', display_name: 'Kegiatan Besar' },
    { id: 'type-kk', name: 'kegiatan_kecil', display_name: 'Kegiatan Kecil' },
    { id: 'type-adv', name: 'advokasi', display_name: 'Advokasi' },
    { id: 'type-other', name: 'lainnya', display_name: 'Lainnya' }
  ];

  const insertType = db.prepare('INSERT OR IGNORE INTO program_types (id, name, display_name) VALUES (?, ?, ?)');
  programTypes.forEach(t => insertType.run(t.id, t.name, t.display_name));

  const programCategories = [
    { id: 'cat-edu', name: 'pendidikan', display_name: 'Pendidikan' },
    { id: 'cat-social', name: 'sosial', display_name: 'Sosial' },
    { id: 'cat-sport', name: 'olahraga', display_name: 'Olahraga' },
    { id: 'cat-art', name: 'seni', display_name: 'Seni & Budaya' },
    { id: 'cat-rel', name: 'keagamaan', display_name: 'Keagamaan' },
    { id: 'cat-other', name: 'lainnya', display_name: 'Lainnya' }
  ];

  const insertCategory = db.prepare('INSERT OR IGNORE INTO program_categories (id, name, display_name) VALUES (?, ?, ?)');
  programCategories.forEach(c => insertCategory.run(c.id, c.name, c.display_name));
}

initDatabase();

module.exports = db;
