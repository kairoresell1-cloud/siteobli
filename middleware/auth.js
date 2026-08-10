const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'oblivion_super_secret_key_2026';

function authMiddleware(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireAtLeastAdmin(req, res, next) {
  const allowed = ['admin', 'owner', 'super_owner'];
  if (!allowed.includes(req.user?.role)) {
    return res.status(403).json({ error: 'Forbidden: requires admin access' });
  }
  next();
}

function requireAtLeastOwner(req, res, next) {
  const allowed = ['owner', 'super_owner'];
  if (!allowed.includes(req.user?.role)) {
    return res.status(403).json({ error: 'Forbidden: requires owner access' });
  }
  next();
}

function requireSuperOwner(req, res, next) {
  if (req.user?.role !== 'super_owner') {
    return res.status(403).json({ error: 'Forbidden: requires super owner access' });
  }
  next();
}

module.exports = { authMiddleware, requireAtLeastAdmin, requireAtLeastOwner, requireSuperOwner, JWT_SECRET };
