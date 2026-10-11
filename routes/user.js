const express = require('express');
const router = express.Router();
const { users, keys, userConfigs } = require('../database');
const { authMiddleware } = require('../middleware/auth');

router.get('/me', authMiddleware, async (req, res) => {
  const user = await users.findOne({ _id: req.user.id });
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Remove hash for safety
  const { password_hash, ...safeUser } = user;

  const userKeys = await keys.find({ user_id: user._id });
  const uc = await userConfigs.findOne({ user_id: user._id });
  res.json({ user: safeUser, keys: userKeys, token: uc ? uc.token : null });
});

router.post('/redeem', authMiddleware, async (req, res) => {
  const { key_string } = req.body || {};
  const trimmed = (key_string || '').trim();
  if (!trimmed) {
    return res.status(400).json({ error: 'License key is required' });
  }

  console.log(`[REDEEM] User ${req.user?.username || req.user?.id} attempting to redeem key: "${trimmed}"`);

  try {
    // Case-insensitive lookup for license key
    const escaped = trimmed.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const key = await keys.findOne({
      key_string: new RegExp('^' + escaped + '$', 'i')
    });

    if (!key) {
      console.warn(`[REDEEM] Key not found: "${trimmed}"`);
      return res.status(404).json({ error: 'Invalid license key. Please check for typos.' });
    }

    if (key.status === 'revoked') {
      console.warn(`[REDEEM] Key revoked: "${key.key_string}"`);
      return res.status(400).json({ error: 'This license key has been revoked.' });
    }

    if (key.status !== 'available') {
      console.warn(`[REDEEM] Key already used: "${key.key_string}" status: ${key.status}`);
      return res.status(400).json({ error: 'This license key has already been redeemed.' });
    }

    // Check if key is expired
    if (key.expires_at) {
      const expDate = key.expires_at.$$date ? new Date(key.expires_at.$$date) : new Date(key.expires_at);
      if (!isNaN(expDate.getTime()) && expDate < new Date()) {
        console.warn(`[REDEEM] Key expired: "${key.key_string}"`);
        return res.status(400).json({ error: 'This license key has expired.' });
      }
    }

    // Check existing keys for conflicts (only active, unexpired keys)
    const existingKeys = await keys.find({ user_id: req.user.id });
    const hasActiveConflict = existingKeys.some(k => {
      if (k.status === 'revoked') return false;
      if (k.expires_at) {
        const kExp = k.expires_at.$$date ? new Date(k.expires_at.$$date) : new Date(k.expires_at);
        if (!isNaN(kExp.getTime()) && kExp < new Date()) return false; // Expired, so not blocking
      }
      return (k.game === key.game || k.game === 'global' || key.game === 'global');
    });

    if (hasActiveConflict) {
      const gameLabel = key.game === 'global' ? 'all games' : key.game.toUpperCase();
      console.warn(`[REDEEM] User ${req.user.username} already has active key for ${gameLabel}`);
      return res.status(400).json({ error: `You already have an active license key for ${gameLabel}.` });
    }

    // Assign key to user
    await keys.update({ _id: key._id }, { $set: { user_id: req.user.id, status: 'assigned' } });

    // Log the redemption action
    const { logs } = require('../database');
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await logs.insert({
      user_id: req.user.id,
      username: req.user.username,
      action: 'KEY_REDEEMED',
      actor: req.user.username,
      target: key.game,
      detail: `Redeemed key ${key.key_string} for ${key.game}`,
      ip,
      created_at: new Date()
    });

    console.log(`[REDEEM SUCCESS] User ${req.user.username} successfully redeemed key ${key.key_string} (${key.game})`);
    res.json({ ok: true, game: key.game, key_string: key.key_string });
  } catch (err) {
    console.error(`[REDEEM ERROR]`, err);
    res.status(500).json({ error: 'Internal server error while redeeming key.' });
  }
});

router.post('/inject', authMiddleware, async (req, res) => {
  const { logs } = require('../database');
  await users.update({ _id: req.user.id }, { $set: { is_injected: true } });
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  await logs.insert({ user_id: req.user.id, username: req.user.username, action: 'INJECTED', ip, created_at: new Date() });
  res.json({ ok: true });
});
router.post('/uninject', authMiddleware, async (req, res) => {
  const { logs } = require('../database');
  await users.update({ _id: req.user.id }, { $set: { is_injected: false } });
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  await logs.insert({ user_id: req.user.id, username: req.user.username, action: 'UNINJECTED', ip, created_at: new Date() });
  res.json({ ok: true });
});

module.exports = router;
