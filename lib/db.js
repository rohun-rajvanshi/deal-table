// PostgreSQL connection shared by the API routes.
// Either set DATABASE_URL (postgres://user:pass@host:5432/dealtable)
// or the standard PGHOST, PGUSER, PGPASSWORD, PGDATABASE (and optional PGPORT) settings.
import pg from 'pg';

const url = process.env.DATABASE_URL || undefined;
const host = url || process.env.PGHOST || '';
if (!host) {
  console.error('No database configured. Set DATABASE_URL, or PGHOST/PGUSER/PGPASSWORD/PGDATABASE, in .env or your host settings.');
}

// Managed databases (Azure, AWS, etc.) require TLS. Turn it off for a local database with PGSSL=disable.
const wantSsl = process.env.PGSSL ? process.env.PGSSL !== 'disable' : !/localhost|127\.0\.0\.1/.test(host);

export const pool = new pg.Pool({
  connectionString: url,
  ssl: wantSsl ? { rejectUnauthorized: false } : false,
  max: Number(process.env.PGPOOL_MAX || 10),
});

export const db = {
  query: (sql, params = []) => pool.query(sql, params),
};
