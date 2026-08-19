const jwt = require('jsonwebtoken');

// Cache de tokens verificados para evitar criptografía en cada request
const tokenCache = new Map();
const CACHE_TTL = 60_000; // 1 minuto

setInterval(() => {
  const now = Date.now();
  for (const [token, entry] of tokenCache) {
    if (entry.cachedAt + CACHE_TTL < now) tokenCache.delete(token);
  }
}, 5 * 60 * 1000);

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const token = header.slice(7);
  try {
    const cached = tokenCache.get(token);
    if (cached && cached.cachedAt + CACHE_TTL > Date.now()) {
      req.user = cached.user;
    } else {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
      tokenCache.set(token, { user: req.user, cachedAt: Date.now() });
    }
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'Acceso restringido a administradores' });
    }
    next();
  });
}

module.exports = { requireAuth, requireAdmin };
