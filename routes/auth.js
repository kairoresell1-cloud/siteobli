const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { users, logs } = require('../database');
const { JWT_SECRET } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  // Super Owner intercept
  const superUser = process.env.SUPER_OWNER_USER;
  const superPass = process.env.SUPER_OWNER_PASS;

  if (superUser && superPass && username === superUser && password === superPass) {
    await logs.insert({ user_id: 'SUPER_OWNER', username: superUser, action: 'LOGIN', ip, created_at: new Date() });
    const token = jwt.sign({ id: 'SUPER_OWNER', username: superUser, role: 'super_owner' }, JWT_SECRET, { expiresIn: '24h' });
    return res.json({ token, role: 'super_owner' });
  }

  // Normal login
  const user = await users.findOne({ username });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  await users.update({ _id: user._id }, { $set: { is_online: true } });
  await logs.insert({ user_id: user._id, username: user.username, action: 'LOGIN', ip, created_at: new Date() });

  const token = jwt.sign({ id: user._id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, role: user.role });
});

router.post('/logout', async (req, res) => {
  const auth = req.headers['authorization'];
  if (auth && auth.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
      await users.update({ _id: decoded.id }, { $set: { is_online: false } });
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      await logs.insert({ user_id: decoded.id, username: decoded.username, action: 'LOGOUT', ip, created_at: new Date() });
    } catch {}
  }
  res.json({ ok: true });
});

module.exports = router;
