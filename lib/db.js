// Database used by the API routes.
//
// Two options:
//  1. A PostgreSQL server: set DATABASE_URL (postgres://user:pass@host:5432/dealtable)
//     or the standard PGHOST, PGUSER, PGPASSWORD, PGDATABASE (and optional PGPORT) settings.
//  2. No settings: a built-in PostgreSQL (PGlite) that keeps its data in a folder on disk
//     (DATA_DIR, default ./data). Good for a single small server such as Azure App Service Free.
import pg from 'pg';
import { fileURLToPath } from 'node:url';

const url = process.env.DATABASE_URL || undefined;
const external = !!(url || process.env.PGHOST);

let pool;
if (external) {
  // Managed databases (Azure, AWS, etc.) require TLS. Turn it off for a local database with PGSSL=disable.
  const host = url || process.env.PGHOST;
  const wantSsl = process.env.PGSSL ? process.env.PGSSL !== 'disable' : !/localhost|127\.0\.0\.1/.test(host);
  pool = new pg.Pool({
    connectionString: url,
    ssl: wantSsl ? { rejectUnauthorized: false } : false,
    max: Number(process.env.PGPOOL_MAX || 10),
  });
} else {
  const { PGlite } = await import('@electric-sql/pglite');
  const dir = process.env.DATA_DIR || fileURLToPath(new URL('../data', import.meta.url));
  const lite = new PGlite(dir);
  await lite.waitReady;
  console.log('Using the built-in database in', dir);
  // Run one statement at a time; PGlite has a single connection.
  let queue = Promise.resolve();
  const run = (fn) => { const p = queue.then(fn, fn); queue = p.catch(() => {}); return p; };
  const query = (sql, params = []) => run(async () => {
    if (params.length) return lite.query(sql, params);
    const results = await lite.exec(sql); // allows several statements (migrations)
    return results[results.length - 1] || { rows: [] };
  });
  pool = {
    query,
    // Migrations use connect() for a transaction; on one connection a plain sequence is equivalent.
    connect: async () => ({ query, release() {} }),
  };
}

export { pool };
export const db = {
  query: (sql, params = []) => pool.query(sql, params),
};
