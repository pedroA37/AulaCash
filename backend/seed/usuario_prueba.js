require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../src/config/db');

async function seed() {
  const hash = await bcrypt.hash('Test1234!', 12);
  try {
    const { rows } = await pool.query(
      `INSERT INTO usuarios (dni, email, password_hash, nombre, apellido, rol, alias, cbu)
       VALUES ('12345678', 'usuario@aulacash.edu', $1, 'Juan', 'Perez', 'user', 'juan.perez.1234', '0000000000000000000002')
       ON CONFLICT (email) DO NOTHING
       RETURNING id, nombre, apellido, email, alias, rol`,
      [hash]
    );
    console.log('Usuario de prueba creado:', JSON.stringify(rows[0], null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

seed();
