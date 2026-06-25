const pool = require('../config/db');

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generarCodigo(len = 6) {
  let code = '';
  for (let i = 0; i < len; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

async function generarCodigoUnico() {
  for (let i = 0; i < 20; i++) {
    const codigo = generarCodigo(6);
    const { rowCount } = await pool.query('SELECT 1 FROM mercados WHERE codigo = $1', [codigo]);
    if (rowCount === 0) return codigo;
  }
  throw new Error('No se pudo generar un código único para el mercado');
}

module.exports = { generarCodigoUnico };
