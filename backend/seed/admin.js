require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../src/config/db');

async function seed() {
  const email = process.env.ADMIN_EMAIL || 'admin@aulacash.edu';
  const password = process.env.ADMIN_PASSWORD || 'Admin1234!';
  const hash = await bcrypt.hash(password, 12);

  try {
    await pool.query(
      `INSERT INTO usuarios (dni, email, password_hash, nombre, apellido, rol, alias, cbu)
       VALUES ('00000000', $1, $2, 'Admin', 'Sistema', 'admin', 'admin.sistema.0001', '0000000000000000000001')
       ON CONFLICT (email) DO NOTHING`,
      [email, hash]
    );
    console.log(`Admin creado: ${email} / ${password}`);
    console.log('¡Cambiá la contraseña en producción!');
  } catch (err) {
    console.error('Error al crear admin:', err.message);
  } finally {
    await pool.end();
  }
}

seed();
