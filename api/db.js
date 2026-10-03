// Camada de dados D1 com subconjunto compatível da API do supabase-js.
// Suporta os padrões usados em index.js:
//   .from(t).select([cols]).eq(...).ilike/like(...).order(...).limit(...).single()/.maybeSingle()
//   .from(t).insert(obj|arr)[.select()[.single()]]
//   .from(t).update(obj).eq(...)[.select()[.single()]]
//   .from(t).delete().eq(...)
// Todas as chamadas resolvem para { data, error } (nunca rejeitam), como o supabase-js.

const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

function assertIdent(name) {
  if (typeof name !== 'string' || !IDENT_RE.test(name)) {
    throw new Error(`Identificador SQL inválido: ${String(name)}`);
  }
  return name;
}

function bindValue(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function makeError(message, code = null) {
  const err = new Error(message);
  err.code = code;
  err.details = null;
  err.hint = null;
  return err;
}

function toError(err) {
  if (err instanceof Error) return err;
  return makeError(String(err));
}

// Colunas BOOLEAN precisam voltar como true/false (o Postgres fazia isso).
const boolColsCache = new Map();

async function boolColumns(db, table) {
  if (boolColsCache.has(table)) return boolColsCache.get(table);
  const t = assertIdent(table);
  const { results } = await db
    .prepare(`SELECT name, type FROM pragma_table_info('${t}')`)
    .all();
  const set = new Set(
    results
      .filter((r) => String(r.type || '').toUpperCase() === 'BOOLEAN')
      .map((r) => r.name)
  );
  boolColsCache.set(table, set);
  return set;
}

function convertBooleans(rows, cols) {
  if (!cols.size) return rows;
  for (const row of rows) {
    for (const col of cols) {
      const v = row[col];
      if (v !== null && v !== undefined && typeof v !== 'boolean') {
        row[col] = Boolean(v);
      }
    }
  }
  return rows;
}

// Ordenação em JS com colação pt-BR (aproxima o comportamento do Postgres;
// o ORDER BY binário do SQLite separaria acentos no fim da lista).
function applyOrder(rows, orders) {
  if (!orders.length) return rows;
  const sorted = rows.slice();
  sorted.sort((a, b) => {
    for (const [col, dir] of orders) {
      const va = a[col];
      const vb = b[col];
      if (va === vb) continue;
      // Postgres: NULLS LAST em ASC, NULLS FIRST em DESC
      if (va === null || va === undefined) return dir === 'ASC' ? 1 : -1;
      if (vb === null || vb === undefined) return dir === 'ASC' ? -1 : 1;
      let cmp;
      if (typeof va === 'string' && typeof vb === 'string') {
        cmp = va.localeCompare(vb, 'pt-BR');
      } else {
        cmp = va < vb ? -1 : 1;
      }
      if (cmp !== 0) return dir === 'ASC' ? cmp : -cmp;
    }
    return 0;
  });
  return sorted;
}

class Query {
  constructor(db, table) {
    this.db = db;
    this.table = table;
    this.mode = 'select'; // select | insert | update | delete
    this.payload = null;
    this.columns = '*';
    this.returning = false;
    this.filters = []; // [col, op, val]
    this.orders = []; // [col, 'ASC'|'DESC']
    this.limitN = null;
    this.want = null; // 'single' | 'maybe' | null
  }

  select(cols = '*') {
    if (this.mode === 'select') {
      this.columns = cols ?? '*';
    } else {
      this.returning = true;
      this.columns = cols ?? '*';
    }
    return this;
  }

  insert(payload) {
    this.mode = 'insert';
    this.payload = payload;
    return this;
  }

  update(payload) {
    this.mode = 'update';
    this.payload = payload;
    return this;
  }

  delete() {
    this.mode = 'delete';
    return this;
  }

  eq(col, value) {
    this.filters.push([col, '=', value]);
    return this;
  }

  // SQLite: LIKE já é case-insensitive para ASCII por padrão
  ilike(col, pattern) {
    this.filters.push([col, 'LIKE', pattern]);
    return this;
  }

  like(col, pattern) {
    this.filters.push([col, 'LIKE', pattern]);
    return this;
  }

  order(col, opts = {}) {
    this.orders.push([col, opts.ascending === false ? 'DESC' : 'ASC']);
    return this;
  }

  limit(n) {
    this.limitN = n;
    return this;
  }

  single() {
    this.want = 'single';
    return this;
  }

  maybeSingle() {
    this.want = 'maybe';
    return this;
  }

  then(onFulfilled, onRejected) {
    return this._exec().then(onFulfilled, onRejected);
  }

  _colsSql() {
    let cols = String(this.columns ?? '*').trim();
    if (!cols || cols === '*') return '*';
    const parts = cols.split(',').map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return '*';
    return parts
      .map((p) => {
        if (p === '*') return '*';
        assertIdent(p);
        return `"${p}"`;
      })
      .join(', ');
  }

  _whereSql(params) {
    if (!this.filters.length) return '';
    const parts = this.filters.map(([col, op, value]) => {
      assertIdent(col);
      if (value === null || value === undefined) return `"${col}" IS NULL`;
      params.push(bindValue(value));
      if (op === 'LIKE') return `"${col}" LIKE ?`;
      return `"${col}" = ?`;
    });
    return ' WHERE ' + parts.join(' AND ');
  }

  _shape(rows) {
    if (this.want === 'single') {
      if (rows.length === 1) return { data: rows[0], error: null };
      return {
        data: null,
        error: makeError(
          'JSON object requested, multiple (or no) rows returned',
          'PGRST116'
        )
      };
    }
    if (this.want === 'maybe') {
      if (rows.length === 0) return { data: null, error: null };
      if (rows.length === 1) return { data: rows[0], error: null };
      return {
        data: null,
        error: makeError(
          'JSON object requested, multiple rows returned',
          'PGRST116'
        )
      };
    }
    return { data: rows, error: null };
  }

  async _finishSelect(rows) {
    const bools = await boolColumns(this.db, this.table);
    convertBooleans(rows, bools);
    let out = applyOrder(rows, this.orders);
    if (this.limitN !== null && this.limitN !== undefined) {
      out = out.slice(0, this.limitN);
    }
    return this._shape(out);
  }

  async _doSelect() {
    const params = [];
    const where = this._whereSql(params);
    const sql = `SELECT ${this._colsSql()} FROM "${this.table}"${where}`;
    const stmt = this.db.prepare(sql);
    const { results } = await (params.length ? stmt.bind(...params) : stmt).all();
    return this._finishSelect(results);
  }

  async _doInsert() {
    const rowsIn = Array.isArray(this.payload) ? this.payload : [this.payload];
    if (!rowsIn.length) throw makeError('INSERT sem linhas');
    const keys = Object.keys(rowsIn[0]);
    if (!keys.length) throw makeError('INSERT sem colunas');
    keys.forEach(assertIdent);

    const colSql = keys.map((k) => `"${k}"`).join(', ');
    const valuesSql = rowsIn
      .map(() => `(${keys.map(() => '?').join(', ')})`)
      .join(', ');
    const params = rowsIn.flatMap((r) => keys.map((k) => bindValue(r[k])));
    let sql = `INSERT INTO "${this.table}" (${colSql}) VALUES ${valuesSql}`;

    if (this.returning) {
      sql += ` RETURNING ${this._colsSql()}`;
      const { results } = await this.db.prepare(sql).bind(...params).all();
      return this._finishSelect(results);
    }

    await this.db.prepare(sql).bind(...params).run();
    return { data: null, error: null };
  }

  async _doUpdate() {
    if (!this.filters.length) {
      throw makeError('UPDATE sem WHERE não é permitido');
    }
    const keys = Object.keys(this.payload || {});
    if (!keys.length) throw makeError('UPDATE sem colunas');
    keys.forEach(assertIdent);

    const params = [];
    const setSql = keys
      .map((k) => {
        params.push(bindValue(this.payload[k]));
        return `"${k}" = ?`;
      })
      .join(', ');
    const where = this._whereSql(params);
    let sql = `UPDATE "${this.table}" SET ${setSql}${where}`;

    if (this.returning) {
      sql += ` RETURNING ${this._colsSql()}`;
      const { results } = await this.db.prepare(sql).bind(...params).all();
      return this._finishSelect(results);
    }

    await this.db.prepare(sql).bind(...params).run();
    return { data: null, error: null };
  }

  async _doDelete() {
    if (!this.filters.length) {
      throw makeError('DELETE sem WHERE não é permitido');
    }
    const params = [];
    const where = this._whereSql(params);
    const sql = `DELETE FROM "${this.table}"${where}`;
    const stmt = this.db.prepare(sql);
    await (params.length ? stmt.bind(...params) : stmt).run();
    return { data: null, error: null };
  }

  async _exec() {
    try {
      assertIdent(this.table);
      switch (this.mode) {
        case 'select':
          return await this._doSelect();
        case 'insert':
          return await this._doInsert();
        case 'update':
          return await this._doUpdate();
        case 'delete':
          return await this._doDelete();
        default:
          throw makeError(`Modo desconhecido: ${this.mode}`);
      }
    } catch (err) {
      return { data: null, error: toError(err) };
    }
  }
}

export function createClient(db) {
  if (!db) throw new Error('Binding D1 (DB) não configurada');
  return {
    from(table) {
      return new Query(db, table);
    }
  };
}
