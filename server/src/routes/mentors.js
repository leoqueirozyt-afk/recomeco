import { getDb, saveDb } from '../database/db.js';

export function getAllMentors() {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM mentors ORDER BY fullName ASC');
  
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export function getMentorById(id) {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM mentors WHERE id = ?');
  stmt.bind([id]);
  
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
}

export function createMentor(data) {
  const db = getDb();
  const now = new Date().toISOString();
  
  db.run(`
    INSERT INTO mentors (fullName, phone, notes, active, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    data.fullName,
    data.phone || null,
    data.notes || null,
    data.active !== false ? 1 : 0,
    now,
    now
  ]);
  
  const lastId = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
  saveDb();
  return lastId;
}

export function updateMentor(id, data) {
  const db = getDb();
  const now = new Date().toISOString();
  
  db.run(`
    UPDATE mentors SET
      fullName = ?, phone = ?, notes = ?, active = ?, updatedAt = ?
    WHERE id = ?
  `, [
    data.fullName,
    data.phone || null,
    data.notes || null,
    data.active !== false ? 1 : 0,
    now,
    id
  ]);
  
  saveDb();
}

export function deleteMentor(id) {
  const db = getDb();
  db.run('DELETE FROM people_mentors WHERE mentorId = ?', [id]);
  db.run('DELETE FROM mentors WHERE id = ?', [id]);
  saveDb();
}