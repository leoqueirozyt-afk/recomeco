import { getDb } from '../database/db.js';

export function getDashboardSummary() {
  const db = getDb();
  
  function count(sql) {
    const result = db.exec(sql);
    return result.length > 0 ? result[0].values[0][0] : 0;
  }
  
  const total = count('SELECT COUNT(*) FROM people');
  const inCare = count("SELECT COUNT(*) FROM people WHERE discipleStatus = 'Em cuidado'");
  const awaitingDecision = count("SELECT COUNT(*) FROM people WHERE discipleStatus = 'Aguardando decisão'");
  const disciple = count("SELECT COUNT(*) FROM people WHERE discipleStatus = 'Discípulo'");
  const visitor = count("SELECT COUNT(*) FROM people WHERE discipleStatus = 'Visitante'");
  const baptized = count("SELECT COUNT(*) FROM people WHERE baptized = 'Sim'");
  const notBaptized = count("SELECT COUNT(*) FROM people WHERE baptized = 'Não'");
  
  function queryAll(sql) {
    const stmt = db.prepare(sql);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }
  
  const byStatus = queryAll(`
    SELECT discipleStatus as status, COUNT(*) as count
    FROM people
    GROUP BY discipleStatus
  `);
  
  const byMonth = queryAll(`
    SELECT decisionMonth as month, COUNT(*) as count
    FROM people
    WHERE decisionMonth IS NOT NULL AND decisionMonth != ''
    GROUP BY decisionMonth
    ORDER BY decisionMonth DESC
  `);
  
  const byFinalDecision = queryAll(`
    SELECT finalDecision as decision, COUNT(*) as count
    FROM people
    GROUP BY finalDecision
  `);

  const byFirstDecision = queryAll(`
    SELECT firstDecision as decision, COUNT(*) as count
    FROM people
    WHERE firstDecision IS NOT NULL AND firstDecision != ''
    GROUP BY firstDecision
  `);
  
  const byGender = queryAll(`
    SELECT gender as gender, COUNT(*) as count
    FROM people
    WHERE gender IS NOT NULL AND gender != ''
    GROUP BY gender
  `);
  
  const withoutMentor = count(`
    SELECT COUNT(*) FROM people
    WHERE (mentors IS NULL OR mentors = '')
  `);
  
  const potentialBaptized = count(`
    SELECT COUNT(*) FROM people
    WHERE baptized = 'Não' AND discipleStatus = 'Discípulo'
  `);
  
  const recentPeople = queryAll(`
    SELECT id, fullName, discipleStatus, baptized, decisionDate, createdAt
    FROM people
    ORDER BY createdAt DESC
    LIMIT 5
  `);
  
  const recentDecisions = queryAll(`
    SELECT id, fullName, firstDecision, decisionDate
    FROM people
    WHERE decisionDate IS NOT NULL AND decisionDate != ''
    ORDER BY decisionDate DESC
    LIMIT 5
  `);

  return {
    total,
    inCare,
    awaitingDecision,
    disciple,
    visitor,
    baptized,
    notBaptized,
    byStatus,
    byMonth,
    byFinalDecision,
    byFirstDecision,
    byGender,
    withoutMentor,
    potentialBaptized,
    recentPeople,
    recentDecisions
  };
}