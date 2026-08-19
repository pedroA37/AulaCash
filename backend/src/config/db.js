const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 30,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
  statement_timeout: 30000,
});

pool.on('error', (err) => {
  console.error('[db] Error inesperado en el pool de Postgres:', err.message);
});

module.exports = pool;
