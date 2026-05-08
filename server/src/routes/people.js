import { getDb, saveDb } from '../database/db.js';

export function getAllPeople() {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT p.*, GROUP_CONCAT(m.id || '-' || m.fullName, ', ') as mentors
    FROM people p
    LEFT JOIN people_mentors pm ON p.id = pm.personId
    LEFT JOIN mentors m ON pm.mentorId = m.id
    GROUP BY p.id
    ORDER BY p.createdAt DESC
  `);
  
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export function getPersonById(id) {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT p.*, GROUP_CONCAT(m.id || '-' || m.fullName, ', ') as mentors
    FROM people p
    LEFT JOIN people_mentors pm ON p.id = pm.personId
    LEFT JOIN mentors m ON pm.mentorId = m.id
    WHERE p.id = ?
    GROUP BY p.id
  `);
  stmt.bind([id]);
  
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
}

export function createPerson(data) {
  const db = getDb();
  const now = new Date().toISOString();
  
  db.run(`
    INSERT INTO people (
      decisionDate, decisionMonth, fullName, birthDate, fullAddress,
      contact, gender, baptized, firstDecision, discipleStatus,
      finalDecision, photo, notes, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    data.decisionDate || null,
    data.decisionMonth || null,
    data.fullName,
    data.birthDate || null,
    data.fullAddress || null,
    data.contact || null,
    data.gender || null,
    data.baptized || 'Não',
    data.firstDecision || null,
    data.discipleStatus || 'Em cuidado',
    data.finalDecision || 'Em acompanhamento',
    data.photo || null,
    data.notes || null,
    now,
    now
  ]);
  
  const lastId = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
  
  if (data.mentorIds && data.mentorIds.length > 0) {
    data.mentorIds.forEach(mentorId => {
      db.run('INSERT INTO people_mentors (personId, mentorId) VALUES (?, ?)', [lastId, mentorId]);
    });
  }
  
  saveDb();
  return lastId;
}

export function updatePerson(id, data) {
  const db = getDb();
  const now = new Date().toISOString();
  
  db.run(`
    UPDATE people SET
      decisionDate = ?, decisionMonth = ?, fullName = ?, birthDate = ?,
      fullAddress = ?, contact = ?, gender = ?, baptized = ?,
      firstDecision = ?, discipleStatus = ?, finalDecision = ?,
      photo = ?, notes = ?, updatedAt = ?
    WHERE id = ?
  `, [
    data.decisionDate || null,
    data.decisionMonth || null,
    data.fullName,
    data.birthDate || null,
    data.fullAddress || null,
    data.contact || null,
    data.gender || null,
    data.baptized || 'Não',
    data.firstDecision || null,
    data.discipleStatus || 'Em cuidado',
    data.finalDecision || 'Em acompanhamento',
    data.photo || null,
    data.notes || null,
    now,
    id
  ]);
  
  db.run('DELETE FROM people_mentors WHERE personId = ?', [id]);
  
  if (data.mentorIds && data.mentorIds.length > 0) {
    data.mentorIds.forEach(mentorId => {
      db.run('INSERT INTO people_mentors (personId, mentorId) VALUES (?, ?)', [id, mentorId]);
    });
  }
  
  saveDb();
}

export function deletePerson(id) {
  const db = getDb();
  db.run('DELETE FROM people_mentors WHERE personId = ?', [id]);
  db.run('DELETE FROM people WHERE id = ?', [id]);
  saveDb();
}