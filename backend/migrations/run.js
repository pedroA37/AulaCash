require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../src/config/db');

async function run() {
  const migrationsDir = __dirname;
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    try {
      await pool.query(sql);
      console.log(`✓ Migración aplicada: ${file}`);
    } catch (err) {
      console.error(`✗ Error en ${file}:`, err.message);
      process.exit(1);
    }
  }

  await pool.end();
  console.log('Todas las migraciones aplicadas correctamente');
}

run();
