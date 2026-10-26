// PostgreSQL connection shared by the API routes.
// Set DATABASE_URL, e.g. postgres://user:pass@host:5432/dealtable
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env (or set it in your host settings) and point it at a PostgreSQL database.');
}

// Managed databases (Azure, AWS, etc.) require TLS. Turn it off for a local database with PGSSL=disable.
const wantSsl = process.env.PGSSL ? process.env.PGSSL !== 'disable' : !/localhost|127\.0\.0\.1/.test(url || '');

export const pool = new pg.Pool({
  connectionString: url,
  ssl: wantSsl ? { rejectUnauthorized: false } : false,
  max: Number(process.env.PGPOOL_MAX || 10),
});

export const db = {
  query: (sql, params = []) => pool.query(sql, params),
};
