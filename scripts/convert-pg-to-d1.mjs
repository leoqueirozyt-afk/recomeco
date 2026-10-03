#!/usr/bin/env node
/**
 * Converte um dump pg_dump (PostgreSQL/Supabase) para SQL compatível com Cloudflare D1 (SQLite).
 *
 * Uso:
 *   node scripts/convert-pg-to-d1.mjs [arquivo_entrada.sql] [arquivo_saida.sql]
 *
 * Padrão:
 *   entrada : backup_supabase.sql
 *   saída   : backup_d1.sql
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const inputPath = resolve(process.argv[2] ?? 'backup_supabase.sql');
const outputPath = resolve(process.argv[3] ?? 'backup_d1.sql');

// ---------------------------------------------------------------------------
// 1. Infraestrutura: meta-comandos psql, blocos COPY e statements
// ---------------------------------------------------------------------------

function stripPsqlMeta(sql) {
  return sql
    .split(/\r?\n/)
    .filter((line) => !/^\s*\\/.test(line))
    .join('\n');
}

/**
 * pg_dump em formato texto usa "COPY tabela (cols) FROM stdin;" seguido de
 * linhas separadas por TAB e terminadas por "\.". Esse formato é incompatível
 * com SQLite/D1, então extraímos os blocos ANTES do particionamento de
 * statements (senão um ";" dentro de um dado encerraria o statement cedo).
 */
function extractCopyBlocks(sql) {
  const blocks = [];
  const re = /^[ \t]*COPY[ \t]+(?:public\.)?([a-z_][a-z0-9_]*)[ \t]*\(([^)]*)\)[ \t]*FROM[ \t]+stdin[ \t]*;[^\S\n]*\r?\n([\s\S]*?)^\\\.[ \t]*$/gim;
  const cleaned = sql.replace(re, (_m, table, cols, data) => {
    const lines = data.split(/\r?\n/).filter((l) => l.length > 0);
    blocks.push({ table, cols: cols.split(',').map((c) => c.trim()), lines });
    return '\n';
  });
  return { cleaned, blocks };
}

function splitStatements(sql) {
  const stmts = [];
  let cur = '';
  let i = 0;
  const n = sql.length;

  while (i < n) {
    const c = sql[i];

    if (c === '-' && sql[i + 1] === '-') {
      while (i < n && sql[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && sql[i + 1] === '*') {
      i += 2;
      while (i < n && !(sql[i] === '*' && sql[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    // string com aspas simples (suporta '' e E'...' com escapes de barra)
    if (c === "'") {
      const prev = cur.trimEnd().slice(-1);
      const isEscapeString = prev === 'E' || prev === 'e';
      cur += c; i++;
      while (i < n) {
        if (isEscapeString && sql[i] === '\\') { cur += sql[i] + (sql[i + 1] ?? ''); i += 2; continue; }
        if (sql[i] === "'" && sql[i + 1] === "'") { cur += "''"; i += 2; continue; }
        if (sql[i] === "'") { cur += "'"; i++; break; }
        cur += sql[i]; i++;
      }
      continue;
    }
    // identificador entre aspas duplas
    if (c === '"') {
      cur += c; i++;
      while (i < n) {
        cur += sql[i];
        if (sql[i] === '"') { i++; break; }
        i++;
      }
      continue;
    }
    // dollar quote ($tag$ ... $tag$)
    if (c === '$') {
      const m = /^(\$[A-Za-z_][A-Za-z0-9_]*\$|\$\$)/.exec(sql.slice(i));
      if (m) {
        const tag = m[1];
        const end = sql.indexOf(tag, i + tag.length);
        cur += sql.slice(i, end === -1 ? n : end + tag.length);
        i = end === -1 ? n : end + tag.length;
        continue;
      }
    }
    if (c === ';') {
      if (cur.trim()) stmts.push(cur.trim());
      cur = '';
      i++;
      continue;
    }
    cur += c;
    i++;
  }
  if (cur.trim()) stmts.push(cur.trim());
  return stmts;
}

/**
 * Aplica `fn` apenas ao trecho de código, preservando literais de string
 * intocados (evita corromper dados que contenham "::", "now()", "public." etc.).
 */
function transformOutsideStrings(sql, fn) {
  let out = '';
  let code = '';
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const c = sql[i];
    if (c === "'") {
      out += fn(code); code = '';
      out += c; i++;
      while (i < n) {
        if (sql[i] === "'" && sql[i + 1] === "'") { out += "''"; i += 2; continue; }
        out += sql[i];
        if (sql[i] === "'") { i++; break; }
        i++;
      }
      continue;
    }
    if (c === '-' && sql[i + 1] === '-') {
      while (i < n && sql[i] !== '\n') { code += sql[i]; i++; }
      continue;
    }
    code += c;
    i++;
  }
  out += fn(code);
  return out;
}

// ---------------------------------------------------------------------------
// 2. Tipos e conversões
// ---------------------------------------------------------------------------

const NON_PUBLIC_SCHEMAS = [
  'auth', 'storage', 'realtime', 'extensions', 'graphql_public',
  'pgbouncer', 'vault', 'pg_catalog', 'information_schema', 'pg_temp',
];

function referencesOtherSchema(sql) {
  return NON_PUBLIC_SCHEMAS.some((s) => new RegExp(`\\b${s}\\s*\\.`, 'i').test(sql));
}

// UUID v4 em SQLite puro (usada como DEFAULT das colunas id)
const UUID_DEFAULT =
  "(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || " +
  "substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', (abs(random()) % 4) + 1, 1) || " +
  "substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))))";

const TYPE_MAP = [
  [/\btimestamp\s+with\s+time\s+zone\b/i, 'TEXT'],
  [/\btimestamp\s+without\s+time\s+zone\b/i, 'TEXT'],
  [/\btime\s+with\s+time\s+zone\b/i, 'TEXT'],
  [/\bcharacter\s+varying\s*(\(\d+\))?/i, 'TEXT'],
  [/\bdouble\s+precision\b/i, 'REAL'],
  [/\bbit\s+varying\b/i, 'TEXT'],
  [/\buuid\b/i, 'TEXT'],
  [/\btimestamptz\b/i, 'TEXT'],
  [/\btimestamp\b/i, 'TEXT'],
  [/\bvarchar\b(\(\d+\))?/i, 'TEXT'],
  [/\bcharacter\b(\(\d+\))?/i, 'TEXT'],
  [/\btext\b/i, 'TEXT'],
  [/\bboolean\b/i, 'BOOLEAN'],
  [/\bbool\b/i, 'BOOLEAN'],
  [/\binteger\b/i, 'INTEGER'],
  [/\bint\b/i, 'INTEGER'],
  [/\bbigint\b/i, 'INTEGER'],
  [/\bsmallint\b/i, 'INTEGER'],
  [/\bserial\b/i, 'INTEGER'],
  [/\bbigserial\b/i, 'INTEGER'],
  [/\bnumeric\b(\(\d+(,\d+)?\))?/i, 'REAL'],
  [/\bdecimal\b(\(\d+(,\d+)?\))?/i, 'REAL'],
  [/\breal\b/i, 'REAL'],
  [/\bjsonb\b/i, 'TEXT'],
  [/\bjson\b/i, 'TEXT'],
  [/\bbytea\b/i, 'BLOB'],
  [/\bdate\b/i, 'TEXT'],
  [/\btime\b/i, 'TEXT'],
];

function mapColumnType(typeText) {
  for (const [re, sqlite] of TYPE_MAP) {
    if (re.test(typeText)) return sqlite;
  }
  return 'TEXT';
}

const CAST_RE = /\s*::\s*(?:"[^"]+"|[a-zA-Z_][a-zA-Z0-9_]*)(?:\s+(?:with|without)\s+time\s+zone)?(?:\[\])?(?:\s*\([^)]*\))?/gi;

function stripCasts(sql) {
  return transformOutsideStrings(sql, (code) => code.replace(CAST_RE, ''));
}

function convertDefault(rest) {
  let out = rest;
  out = out.replace(/\bDEFAULT\s+extensions\.uuid_generate_v4\(\)/i, `DEFAULT ${UUID_DEFAULT}`);
  out = out.replace(/\bDEFAULT\s+(?:uuid_generate_v4|gen_random_uuid)\(\)/i, `DEFAULT ${UUID_DEFAULT}`);
  out = out.replace(/\bDEFAULT\s+now\(\)/i, 'DEFAULT CURRENT_TIMESTAMP');
  return stripCasts(out);
}

function decodeEscapeStrings(sql) {
  return sql.replace(/\bE'((?:[^'\\]|\\.|'')*)'/g, (_m, body) => {
    const decoded = body
      .replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r')
      .replace(/\\b/g, '\b').replace(/\\f/g, '\f').replace(/\\v/g, '\v')
      .replace(/\\0/g, '\0').replace(/\\\\/g, '\\').replace(/''/g, "'");
    return `'${decoded.replace(/'/g, "''")}'`;
  });
}

function unescapePgText(value) {
  if (value === '\\N') return null;
  let out = '';
  for (let i = 0; i < value.length; i++) {
    const c = value[i];
    if (c !== '\\') { out += c; continue; }
    const n = value[++i];
    switch (n) {
      case 't': out += '\t'; break;
      case 'n': out += '\n'; break;
      case 'r': out += '\r'; break;
      case 'b': out += '\b'; break;
      case 'f': out += '\f'; break;
      case 'v': out += '\v'; break;
      case '0': out += '\0'; break;
      case '\\': out += '\\'; break;
      default: out += n ?? '\\'; break;
    }
  }
  return out;
}

function sqlQuote(value) {
  if (value === null) return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

// ---------------------------------------------------------------------------
// 3. Transformações statement a statement
// ---------------------------------------------------------------------------

function parseCreateTable(stmt, state) {
  const nameMatch = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.([a-z_][a-z0-9_]*)\s*\(/i.exec(stmt);
  if (!nameMatch) return null;
  const table = nameMatch[1];

  const openIdx = stmt.indexOf('(', nameMatch.index + nameMatch[0].length - 1);
  const closeIdx = stmt.lastIndexOf(')');
  if (openIdx === -1 || closeIdx === -1 || closeIdx < openIdx) return null;
  const body = stmt.slice(openIdx + 1, closeIdx);

  const parts = [];
  let depth = 0, cur = '';
  for (const ch of body) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());

  const columns = [];
  const inlineConstraints = [];
  const columnTypes = {};

  for (const part of parts) {
    if (/^(CONSTRAINT\b|PRIMARY\s+KEY\b|UNIQUE\b|FOREIGN\s+KEY\b|CHECK\s*\()/i.test(part)) {
      inlineConstraints.push(part);
      continue;
    }
    const m = /^("[^"]+"|[a-z_][a-z0-9_]*)\s+([\s\S]+)$/.exec(part);
    if (!m) { inlineConstraints.push(part); continue; }
    const colName = m[1].replace(/"/g, '');
    const restNorm = convertDefault(m[2]);

    const typeMatch = /^([a-zA-Z][a-zA-Z0-9_ ]*?(?:\s*\([^)]*\))?)\s*(?=$|DEFAULT\b|NOT\s|NULL\b|PRIMARY|UNIQUE|REFERENCES|COLLATE|GENERATED|CHECK|CONSTRAINT)/i.exec(restNorm);
    const typeRaw = typeMatch
      ? typeMatch[1]
      : restNorm.split(/\s+(?=DEFAULT\b|NOT\s|NULL\b|PRIMARY|UNIQUE|REFERENCES)/i)[0];
    const sqliteType = mapColumnType(typeRaw);
    const tail = (typeMatch ? restNorm.slice(typeMatch[0].length) : restNorm.slice(typeRaw.length))
      .replace(/\s+/g, ' ').trim();

    columnTypes[colName] = sqliteType;
    columns.push(`${m[1]} ${sqliteType}${tail ? ' ' + tail : ''}`);
    if (/\bNOT\s+NULL\b/i.test(tail)) {
      if (!state.notNullCols.has(table)) state.notNullCols.set(table, new Set());
      state.notNullCols.get(table).add(colName);
    }
  }

  state.tableTypes.set(table, columnTypes);
  return { table, columns, inlineConstraints };
}

function captureAlterConstraint(stmt, state) {
  const m = /ALTER\s+TABLE\s+(?:ONLY\s+)?public\.([a-z_][a-z0-9_]*)\s+ADD\s+CONSTRAINT\s+("[^"]+"|[a-z_][a-z0-9_]*)\s+([\s\S]+)$/i.exec(stmt);
  if (!m) return false;
  const [, table, constraintName, defRaw] = m;
  const def = decodeEscapeStrings(stripCasts(defRaw)).replace(/\s+/g, ' ').trim().replace(/;$/, '');

  if (/^PRIMARY\s+KEY/i.test(def) || /^UNIQUE/i.test(def)) {
    state.addConstraint(table, `CONSTRAINT ${constraintName} ${def}`);
    return true;
  }
  if (/^FOREIGN\s+KEY/i.test(def)) {
    state.addConstraint(table, def.replace(/\bREFERENCES\s+(?:public\.)?/i, 'REFERENCES '));
    return true;
  }
  return false;
}

function convertIndex(stmt) {
  const m = /CREATE\s+(UNIQUE\s+)?INDEX\s+([a-z_][a-z0-9_]*)\s+ON\s+(?:ONLY\s+)?(?:public\.)?([a-z_][a-z0-9_]*)\s*(?:USING\s+\w+\s*)?\(([\s\S]+?)\)\s*(WHERE[\s\S]+)?$/i.exec(stmt);
  if (!m) return null;
  const [, unique, idxName, table, colsRaw, where] = m;
  const cols = colsRaw
    .replace(/\bCOLLATE\s+"[^"]*"/gi, '')
    .replace(/\btext_pattern_ops\b/gi, '')
    .replace(/\bhash\s+ops\b/gi, '')
    .replace(/\bNULLS\s+NOT\s+DISTINCT\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  const wherePart = where ? ` ${where.trim()}` : '';
  return `CREATE ${unique ?? ''}INDEX ${idxName} ON ${table} (${cols})${wherePart};`;
}

function convertView(stmt) {
  // view "placeholder" do pg_dump (apenas declara tipos com NULL::) é descartada
  if (/NULL\s*::/.test(stmt)) return null;

  const m = /VIEW\s+(?:public\.)?([a-z_][a-z0-9_]*)\s+AS\s+([\s\S]+)$/i.exec(stmt);
  if (!m) return null;
  const [, viewName, bodyRaw] = m;

  if (/string_agg\s*\(/i.test(bodyRaw)) {
    // string_agg(DISTINCT x, ', ' ORDER BY y) não existe em SQLite;
    // reescrevemos como subconsulta correlacionada com group_concat.
    // p.* mantém a view compatível com novas colunas de people.
    const body =
      `SELECT p.*,\n` +
      `    (SELECT group_concat(full_name, ', ')\n` +
      `       FROM (SELECT DISTINCT m2.full_name AS full_name\n` +
      `               FROM people_mentors pm2\n` +
      `               JOIN mentors m2 ON m2.id = pm2.mentor_id\n` +
      `              WHERE pm2.person_id = p.id AND m2.active = true\n` +
      `              ORDER BY m2.full_name)) AS mentors\n` +
      `  FROM people p`;
    return `CREATE VIEW ${viewName} AS\n${body};`;
  }

  const body = transformOutsideStrings(stripCasts(bodyRaw), (code) => code.replace(/\bpublic\./g, ''));
  return `CREATE VIEW ${viewName} AS\n${body};`;
}

function convertTrigger(stmt) {
  const m = /CREATE\s+TRIGGER\s+([a-z_][a-z0-9_]*)\s+([A-Z ]+?)\s+UPDATE\s+ON\s+(?:public\.)?([a-z_][a-z0-9_]*)\s+FOR\s+EACH\s+ROW\s+EXECUTE\s+FUNCTION\s+(?:public\.)?([a-z_][a-z0-9_]*)\s*\(\s*\)/i.exec(stmt);
  if (!m) return null;
  const [, triggerName, timing, table, fnName] = m;

  if (/update_updated_at_column/i.test(fnName)) {
    // WHEN evita recursão infinita e respeita updated_at já definido pela aplicação
    return (
      `CREATE TRIGGER ${triggerName}\n` +
      `${timing.trim()} UPDATE ON ${table}\n` +
      `FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at\n` +
      `BEGIN\n` +
      `  UPDATE ${table} SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;\n` +
      `END;`
    );
  }
  return null;
}

function convertInsert(stmt) {
  let out = stmt.replace(/\bINSERT\s+INTO\s+public\./i, 'INSERT INTO ');
  out = decodeEscapeStrings(out);
  out = transformOutsideStrings(out, (code) =>
    code.replace(/\bnow\(\)/gi, 'CURRENT_TIMESTAMP').replace(CAST_RE, ''));
  if (!/^INSERT\s+INTO\s+[a-z_]/i.test(out)) return null;
  return out.trimEnd().endsWith(';') ? out : out + ';';
}

function copyRowsToInserts(block, state) {
  const types = state.tableTypes.get(block.table) ?? {};
  const inserts = [];
  for (const line of block.lines) {
    const values = line.split('\t').map(unescapePgText);
    const sqlValues = values.map((v, idx) => {
      if (v === null) return 'NULL';
      const type = types[block.cols[idx]] ?? '';
      if (type === 'BOOLEAN') return v === 't' ? '1' : v === 'f' ? '0' : sqlQuote(v);
      if (type === 'INTEGER') return /^-?\d+$/.test(v) ? v : sqlQuote(v);
      if (type === 'REAL') return /^-?\d+(\.\d+)?$/.test(v) ? v : sqlQuote(v);
      return sqlQuote(v);
    });
    inserts.push(`INSERT INTO ${block.table} (${block.cols.join(', ')}) VALUES (${sqlValues.join(', ')});`);
  }
  return inserts;
}

// ---------------------------------------------------------------------------
// 4. Ordenação de dados (pais antes dos filhos) e ordem de DROP
// ---------------------------------------------------------------------------

function parseInsertTarget(sql) {
  const m = /^INSERT\s+INTO\s+([a-z_][a-z0-9_]*)/i.exec(sql);
  return m ? m[1] : null;
}

/**
 * Ordena os INSERTs para que tabelas pai sejam populadas antes das filhas
 * (necessário quando FKs são impostas na importação). Ciclos (ex.: people
 * <-> visitors) são quebrados preservando a ordem original.
 */
function sortInserts(inserts, constraintsByTable) {
  const byTable = new Map();
  for (const sql of inserts) {
    const t = parseInsertTarget(sql);
    if (!t) continue;
    if (!byTable.has(t)) byTable.set(t, []);
    byTable.get(t).push(sql);
  }

  const parents = new Map();
  for (const [table, constraints] of constraintsByTable) {
    const set = new Set();
    for (const c of constraints) {
      const ref = /REFERENCES\s+([a-z_][a-z0-9_]*)/i.exec(c);
      if (ref && ref[1] !== table && byTable.has(ref[1])) set.add(ref[1]);
    }
    parents.set(table, set);
  }

  const ordered = [];
  const placed = new Set();
  const visit = (t) => {
    if (placed.has(t)) return;
    placed.add(t);
    for (const p of parents.get(t) ?? []) visit(p);
    ordered.push(t);
  };
  for (const t of byTable.keys()) visit(t);

  return ordered.flatMap((t) => byTable.get(t) ?? []);
}

/**
 * Divide os INSERTs em duas fases quando o D1 impõe FKs imediatas e os dados
 * têm dependência mútua (ex.: people.visitor_id <-> visitors.recomeco_person_id):
 *   fase 1: INSERT sem as colunas de FK (fica NULL);
 *   fase 2: UPDATE preenchendo as FK depois que TODAS as linhas existem.
 * Funciona mesmo com ciclos reais de dados.
 */
function splitDataPhases(inserts, constraintsByTable, notNullCols, warnings) {
  const fkColsByTable = new Map();
  for (const [table, constraints] of constraintsByTable) {
    for (const c of constraints) {
      const m = /FOREIGN KEY \(([^)]*)\)/i.exec(c);
      if (!m) continue;
      if (!fkColsByTable.has(table)) fkColsByTable.set(table, new Set());
      for (const col of m[1].split(',').map((x) => x.trim().replace(/"/g, ''))) {
        fkColsByTable.get(table).add(col);
      }
    }
  }

  const phase1 = [];
  const phase2 = [];
  let deferred = 0;

  for (const sql of inserts) {
    const m = /^INSERT\s+INTO\s+([a-z_][a-z0-9_]*)\s+\(([^)]*)\)\s+VALUES\s+\(([\s\S]+)\);$/i.exec(sql.trim());
    const table = m?.[1];
    const fkSet = table ? fkColsByTable.get(table) : null;
    if (!m || !fkSet || fkSet.size === 0) { phase1.push(sql); continue; }

    const cols = m[2].split(',').map((c) => c.trim());
    const values = splitSqlTuple(m[3]);
    if (cols.length !== values.length) { phase1.push(sql); continue; }

    const idIdx = cols.indexOf('id');
    const notNull = notNullCols.get(table) ?? new Set();
    const keepCols = [], keepVals = [], updates = [];
    let deferredThis = false;

    cols.forEach((c, i) => {
      const canDefer = fkSet.has(c) && !notNull.has(c) && idIdx !== -1;
      if (canDefer) {
        deferredThis = true;
        updates.push(`${c} = ${values[i]}`);
      } else {
        if (fkSet.has(c) && notNull.has(c)) {
          warnings.push(`FK NOT NULL ${table}.${c} mantida no INSERT (depende da ordem das tabelas).`);
        }
        keepCols.push(c);
        keepVals.push(values[i]);
      }
    });

    if (!deferredThis || updates.every((u) => u.endsWith('= NULL'))) {
      phase1.push(sql);
      continue;
    }
    phase1.push(`INSERT INTO ${table} (${keepCols.join(', ')}) VALUES (${keepVals.join(', ')});`);
    phase2.push(`UPDATE ${table} SET ${updates.join(', ')} WHERE id = ${values[idIdx]};`);
    deferred++;
  }

  return { phase1, phase2, deferred };
}

function splitSqlTuple(inner) {
  const parts = [];
  let cur = '', q = false;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (q) {
      cur += c;
      if (c === "'") {
        if (inner[i + 1] === "'") { cur += inner[i + 1]; i++; }
        else q = false;
      }
    } else {
      if (c === "'") { q = true; cur += c; }
      else if (c === ',') { parts.push(cur.trim()); cur = ''; }
      else cur += c;
    }
  }
  parts.push(cur.trim());
  return parts;
}

function dropOrder(tables, constraintsByTable) {
  const parents = new Map(tables.map((t) => [t, new Set()]));
  for (const [table, constraints] of constraintsByTable) {
    if (!parents.has(table)) continue;
    for (const c of constraints) {
      const ref = /REFERENCES\s+([a-z_][a-z0-9_]*)/i.exec(c);
      if (ref) parents.get(table).add(ref[1]);
    }
  }
  const ordered = [];
  const placed = new Set();
  const visit = (t) => {
    if (placed.has(t)) return;
    placed.add(t);
    for (const p of parents.get(t) ?? []) visit(p);
    ordered.push(t);
  };
  for (const t of tables) visit(t);
  return ordered.reverse();
}

// ---------------------------------------------------------------------------
// 5. Pipeline principal
// ---------------------------------------------------------------------------

function main() {
  const raw = readFileSync(inputPath, 'utf8');
  const warnings = [];
  const stats = {
    tables: [], indexes: 0, views: [], triggers: [],
    insertRows: 0, insertTables: new Set(), constraints: 0, skipped: {},
  };
  const outrosSamples = [];

  const state = {
    tableTypes: new Map(),
    notNullCols: new Map(),
    tableConstraints: new Map(),
    addConstraint(table, text) {
      if (!this.tableConstraints.has(table)) this.tableConstraints.set(table, []);
      this.tableConstraints.get(table).push(text);
      stats.constraints++;
    },
  };

  const parsed = { tables: [], indexes: [], views: [], triggers: [], inserts: [] };

  const { cleaned, blocks } = extractCopyBlocks(stripPsqlMeta(raw));
  const statements = splitStatements(cleaned);

  for (const stmt of statements) {
    const flat = stmt.replace(/\s+/g, ' ').trim();
    const head = flat.toUpperCase();
    const bump = (k) => {
      stats.skipped[k] = (stats.skipped[k] ?? 0) + 1;
      if (k === 'OUTROS' && process.env.DEBUG_OUTROS) outrosSamples.push(flat.slice(0, 200));
    };

    if (/^(SET\b|SELECT\s|DROP\s|CREATE\s+EXTENSION|CREATE\s+PUBLICATION|CREATE\s+EVENT\s+TRIGGER|CREATE\s+POLICY|GRANT\s|REVOKE\s|ALTER\s+DEFAULT\s+PRIVILEGES|COMMENT\s|DO\s|LOCK\s|VACUUM|ANALYZE|CLUSTER|REINDEX|REFRESH\s)/.test(head)) {
      bump(head.startsWith('DROP') ? 'DROP' : 'SESSAO/SUPABASE');
      continue;
    }
    if (/^ALTER\s+TABLE\b/.test(head) && /ENABLE\s+ROW\s+LEVEL\s+SECURITY|DROP\s+(CONSTRAINT|COLUMN|INDEX)|OWNER\s+TO|SET\s+SCHEMA|SET\s+LOGGING/i.test(flat)) {
      bump('RLS/DROP/OWNER');
      continue;
    }
    // objetos de outros schemas (auth, storage, realtime, ...)
    if (referencesOtherSchema(stmt) && !/^CREATE\s+TABLE\s+public\./i.test(flat)) {
      bump('OUTRO_SCHEMA');
      continue;
    }
    if (/^CREATE\s+(OR\s+REPLACE\s+)?(FUNCTION|PROCEDURE|TRIGGER\s+FUNCTION)/i.test(flat)) {
      bump('FUNCTION_PLPGSQL');
      continue;
    }

    if (/^CREATE\s+TABLE\b/i.test(flat)) {
      const res = parseCreateTable(stmt, state);
      if (res) { parsed.tables.push(res); stats.tables.push(res.table); }
      continue;
    }
    if (/^ALTER\s+TABLE\b/i.test(flat)) {
      if (/ADD\s+CONSTRAINT/i.test(flat)) captureAlterConstraint(stmt, state);
      continue;
    }
    if (/^CREATE\s+(UNIQUE\s+)?INDEX\b/i.test(flat)) {
      const res = convertIndex(stmt);
      if (res) { parsed.indexes.push(res); stats.indexes++; }
      continue;
    }
    if (/^DROP\s+(UNIQUE\s+)?INDEX\b/i.test(flat)) { bump('DROP'); continue; }
    if (/^CREATE\s+(OR\s+REPLACE\s+)?VIEW\b/i.test(flat)) {
      const res = convertView(stmt);
      if (res) { parsed.views.push(res); stats.views.push(/CREATE\s+VIEW\s+(\S+)/i.exec(res)[1]); }
      continue;
    }
    if (/^CREATE\s+TRIGGER\b/i.test(flat)) {
      const res = convertTrigger(stmt);
      if (res) { parsed.triggers.push(res); stats.triggers.push(/TRIGGER\s+(\S+)/i.exec(res)[1]); }
      else bump('TRIGGER_NAO_SUPORTADO');
      continue;
    }
    if (/^INSERT\s+INTO\b/i.test(flat)) {
      const res = convertInsert(stmt);
      if (res) {
        parsed.inserts.push(res);
        stats.insertRows++;
        stats.insertTables.add(parseInsertTarget(res));
      }
      continue;
    }
    bump('OUTROS');
  }

  for (const block of blocks) {
    if (!state.tableTypes.has(block.table)) {
      warnings.push(`COPY para tabela desconhecida "${block.table}".`);
      continue;
    }
    const inserts = copyRowsToInserts(block, state);
    parsed.inserts.push(...inserts);
    stats.insertRows += inserts.length;
    stats.insertTables.add(block.table);
  }

  // montagem final (constraints só estão completas depois do loop)
  const finalTables = parsed.tables.map((t) => {
    const injected = state.tableConstraints.get(t.table) ?? [];
    const all = [...t.inlineConstraints, ...injected];
    const body = [...t.columns, ...all].join(',\n    ');
    return { table: t.table, sql: `CREATE TABLE ${t.table} (\n    ${body}\n)` };
  });

  const dropTables = dropOrder(parsed.tables.map((t) => t.table), state.tableConstraints);
  const orderedInserts = sortInserts(parsed.inserts, state.tableConstraints);
  const data = splitDataPhases(orderedInserts, state.tableConstraints, state.notNullCols, warnings);

  const lines = [];
  lines.push('-- Gerado por scripts/convert-pg-to-d1.mjs');
  lines.push(`-- Origem: ${inputPath.split(/[\\/]/).pop()}`);
  lines.push('-- Destino: Cloudflare D1 (SQLite) — não editar manualmente');
  lines.push('');
  lines.push('-- Limpeza para reimportação idempotente');
  for (const v of parsed.views) lines.push(`DROP VIEW IF EXISTS ${/CREATE\s+VIEW\s+(\S+)/i.exec(v)[1]};`);
  for (const t of dropTables) lines.push(`DROP TABLE IF EXISTS ${t};`);
  lines.push('');
  lines.push('-- Tabelas');
  for (const t of finalTables) { lines.push(t.sql + ';'); lines.push(''); }
  if (parsed.indexes.length) { lines.push('-- Índices'); lines.push(...parsed.indexes); lines.push(''); }
  if (parsed.views.length) { lines.push('-- Views'); lines.push(...parsed.views); lines.push(''); }
  if (parsed.triggers.length) { lines.push('-- Triggers'); lines.push(...parsed.triggers); lines.push(''); }
  if (data.phase1.length) { lines.push('-- Dados (fase 1: linhas base)'); lines.push(...data.phase1); lines.push(''); }
  if (data.phase2.length) { lines.push('-- Dados (fase 2: preenchimento de FKs)'); lines.push(...data.phase2); lines.push(''); }

  writeFileSync(outputPath, lines.join('\n'), 'utf8');

  console.log('== Conversão concluída ==');
  console.log(`Entrada : ${inputPath}`);
  console.log(`Saída   : ${outputPath}`);
  console.log(`Tabelas : ${stats.tables.join(', ') || '(nenhuma)'}`);
  console.log(`Constraints (PK/UNIQUE/FK): ${stats.constraints}`);
  console.log(`Índices : ${stats.indexes}`);
  console.log(`Views   : ${stats.views.join(', ') || '(nenhuma)'}`);
  console.log(`Triggers: ${stats.triggers.join(', ') || '(nenhum)'}`);
  console.log(`Dados   : ${stats.insertRows} linhas em [${[...stats.insertTables].join(', ') || 'nenhuma tabela'}]`);
  console.log(`FKs adiadas para fase 2: ${data.deferred} linhas (${data.phase2.length} UPDATEs)`);
  if (Object.keys(stats.skipped).length) console.log(`Descartados: ${JSON.stringify(stats.skipped)}`);
  if (outrosSamples.length) {
    console.log('--- statements em OUTROS ---');
    for (const s of outrosSamples) console.log(`* ${s}`);
  }
  for (const w of warnings) console.log(`AVISO: ${w}`);
  if (stats.insertRows === 0) {
    console.log('AVISO: nenhuma linha de dados foi encontrada para as tabelas públicas.');
  }
}

main();
