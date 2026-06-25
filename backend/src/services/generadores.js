const pool = require('../config/db');

// Genera alias único estilo "palabra.palabra.palabra"
const ADJETIVOS = ['sol', 'luna', 'rio', 'mar', 'viento', 'cielo', 'monte', 'lago', 'flor', 'roca', 'nube', 'pez', 'oso', 'leon', 'puma', 'aguila', 'zorro', 'lobo', 'tigre', 'toro'];
const SUSTANTIVOS = ['azul', 'verde', 'rojo', 'blanco', 'negro', 'dorado', 'norte', 'sur', 'este', 'oeste', 'alto', 'bajo', 'fuerte', 'veloz', 'libre', 'noble', 'fiel', 'claro', 'firme', 'sabio'];

async function generarAliasUnico() {
  for (let i = 0; i < 20; i++) {
    const a1 = ADJETIVOS[Math.floor(Math.random() * ADJETIVOS.length)];
    const a2 = SUSTANTIVOS[Math.floor(Math.random() * SUSTANTIVOS.length)];
    const num = Math.floor(Math.random() * 9000) + 1000;
    const alias = `${a1}.${a2}.${num}`;

    const { rowCount } = await pool.query('SELECT 1 FROM usuarios WHERE alias = $1', [alias]);
    if (rowCount === 0) return alias;
  }
  throw new Error('No se pudo generar un alias único');
}

// CBU simulado de 22 dígitos (no es un CBU real)
async function generarCBUUnico() {
  for (let i = 0; i < 20; i++) {
    const cbu = '000' + Date.now().toString() + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    const cbuFinal = cbu.slice(0, 22);

    const { rowCount } = await pool.query('SELECT 1 FROM usuarios WHERE cbu = $1', [cbuFinal]);
    if (rowCount === 0) return cbuFinal;
  }
  throw new Error('No se pudo generar un CBU único');
}

module.exports = { generarAliasUnico, generarCBUUnico };
