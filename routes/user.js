const express = require('express');
const router = express.Router();
const { users, keys } = require('../database');
const { authMiddleware } = require('../middleware/auth');

router.get('/me', authMiddleware, async (req, res) => {
  const user = await users.findOne({ _id: req.user.id });
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Remove hash for safety
  const { password_hash, ...safeUser } = user;

  const key = await keys.findOne({ user_id: user._id });
  res.json({ user: safeUser, key: key || null });
});

router.post('/redeem', authMiddleware, async (req, res) => {
  const { key_string } = req.body;
  if (!key_string) return res.status(400).json({ error: 'Key required' });
  
  const existingKey = await keys.findOne({ user_id: req.user.id });
  if (existingKey) return res.status(400).json({ error: 'You already have an assigned key' });

  const key = await keys.findOne({ key_string, status: 'available' });
  if (!key) return res.status(404).json({ error: 'Invalid or already used key' });

  await keys.update({ _id: key._id }, { $set: { user_id: req.user.id, status: 'assigned' } });
  res.json({ ok: true, game: key.game });
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
