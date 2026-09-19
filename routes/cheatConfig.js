const express = require('express');
const router = express.Router();
const { users, keys, userConfigs, DEFAULT_CONFIG } = require('../database');
const { authMiddleware } = require('../middleware/auth');

// ─── PUBLIC: Cheat polls this every 2s ───────────────────────────────────────
// GET /api/config?token=XXXX  OR  Authorization: Bearer XXXX
router.get('/config', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  let token = req.query.token || '';
  const authHeader = req.headers['authorization'] || '';
  if (!token && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }

  // Validate token format: exactly 64 hex chars
  if (!token || token.length !== 64 || !/^[0-9a-f]+$/i.test(token)) {
    return res.status(401).json({ error: 'invalid_token' });
  }

  // Find userConfig by token
  const uc = await userConfigs.findOne({ token });
  if (!uc) return res.status(401).json({ error: 'invalid_token' });

  // Find the user
  const user = await users.findOne({ _id: uc.user_id });
  if (!user) return res.status(401).json({ error: 'invalid_token' });

  // Check license — find any assigned key for this user
  const userKeys = await keys.find({ user_id: user._id, status: 'assigned' });
  if (!userKeys.length) return res.status(403).json({ error: 'license_expired' });

  const now = new Date();
  const hasValid = userKeys.some(k => !k.expires_at || new Date(k.expires_at) > now);
  if (!hasValid) return res.status(403).json({ error: 'license_expired' });

  // Return config — merge defaults with user overrides so schema is always complete
  const merged = { ...DEFAULT_CONFIG, ...uc.config };
  return res.status(200).json(merged);
});

// ─── AUTHENTICATED: Dashboard reads/writes config ────────────────────────────
router.get('/userconfig', authMiddleware, async (req, res) => {
  let uc = await userConfigs.findOne({ user_id: req.user.id });
  if (!uc) {
    // Lazy-create if missing (e.g. old accounts)
    const { generateToken } = require('../database');
    const token = generateToken();
    uc = await userConfigs.insert({ user_id: req.user.id, token, config: { ...DEFAULT_CONFIG }, updated_at: new Date() });
  }
  res.json({ token: uc.token, config: { ...DEFAULT_CONFIG, ...uc.config } });
});

router.post('/userconfig', authMiddleware, async (req, res) => {
  const { config } = req.body;
  if (!config || typeof config !== 'object') return res.status(400).json({ error: 'Missing config' });

  // Only keep keys that exist in DEFAULT_CONFIG (no arbitrary injection)
  const safe = {};
  for (const k of Object.keys(DEFAULT_CONFIG)) {
    if (k in config) safe[k] = config[k];
  }

  let uc = await userConfigs.findOne({ user_id: req.user.id });
  if (!uc) {
    const { generateToken } = require('../database');
    const token = generateToken();
    uc = await userConfigs.insert({ user_id: req.user.id, token, config: { ...DEFAULT_CONFIG, ...safe }, updated_at: new Date() });
  } else {
    await userConfigs.update({ _id: uc._id }, { $set: { config: { ...DEFAULT_CONFIG, ...safe }, updated_at: new Date() } });
  }

  res.json({ ok: true });
});

module.exports = router;
