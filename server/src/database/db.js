import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '../database.sqlite');

let db;

export async function initDb() {
  const SQL = await initSqlJs();
  
  let data = null;
  if (fs.existsSync(dbPath)) {
    data = fs.readFileSync(dbPath);
  }
  
  db = new SQL.Database(data);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS mentors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fullName TEXT NOT NULL,
      phone TEXT,
      notes TEXT,
      active INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS people (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      decisionDate TEXT,
      decisionMonth TEXT,
      fullName TEXT NOT NULL,
      birthDate TEXT,
      fullAddress TEXT,
      contact TEXT,
      gender TEXT,
      baptized TEXT DEFAULT 'Não',
      firstDecision TEXT,
      discipleStatus TEXT DEFAULT 'Em cuidado',
      finalDecision TEXT DEFAULT 'Em acompanhamento',
      photo TEXT,
      notes TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  try {
    db.run('ALTER TABLE people ADD COLUMN photo TEXT');
  } catch (e) {}

  db.run(`
    CREATE TABLE IF NOT EXISTS people_mentors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      personId INTEGER NOT NULL,
      mentorId INTEGER NOT NULL,
      FOREIGN KEY (personId) REFERENCES people(id) ON DELETE CASCADE,
      FOREIGN KEY (mentorId) REFERENCES mentors(id) ON DELETE CASCADE
    )
  `);
  
  saveDb();
  return db;
}

export function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

export function getDb() {
  return db;
}

export default { initDb, saveDb, getDb };