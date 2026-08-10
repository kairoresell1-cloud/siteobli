const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { users, keys, logs, generateKeyString } = require('../database');
const { authMiddleware, requireAtLeastAdmin, requireAtLeastOwner, requireSuperOwner } = require('../middleware/auth');

router.use(authMiddleware, requireAtLeastAdmin);

// --- STATS ---
router.get('/stats', async (req, res) => {
  const keysGenerated  = await keys.count({});
  const keysAvailable  = await keys.count({ status: 'available' });
  const usersOnline    = await users.count({ is_online: true });
  const usersInjected  = await users.count({ is_injected: true });
  res.json({ keysGenerated, keysAvailable, usersOnline, usersInjected });
});

// --- USERS ---
router.get('/users', async (req, res) => {
  const allUsers = await users.find({});
  // Join key info
  const result = await Promise.all(allUsers.reverse().map(async u => {
    const { password_hash, ...safe } = u;
    const key = await keys.findOne({ user_id: u._id });
    return { ...safe, key_string: key?.key_string, expires_at: key?.expires_at, key_status: key?.status, key_id: key?._id };
  }));
  res.json(result);
});

router.post('/users', async (req, res) => {
  const { username, password, role, expires_at } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  
  const requesterRole = req.user.role;
  if (role === 'owner' && requesterRole !== 'super_owner') return res.status(403).json({ error: 'Only Super Owner can create Owners' });
  if (role === 'admin' && !['owner', 'super_owner'].includes(requesterRole)) return res.status(403).json({ error: 'Only Owners can create Admins' });
  const hash = bcrypt.hashSync(password, 10);
  try {
    const doc = await users.insert({
      username, password_hash: hash, password_plain: password,
      role: role || 'user', is_online: false, is_injected: false, created_at: new Date()
    });
    
    // Auto-generate key with the chosen duration
    const keyStr = generateKeyString();
    await keys.insert({
      key_string: keyStr,
      user_id: doc._id,
      expires_at: expires_at ? new Date(expires_at) : null,
      status: 'assigned',
      created_at: new Date()
    });

    res.json({ id: doc._id, username });
  } catch (e) {
    res.status(409).json({ error: 'Username already exists' });
  }
});

router.put('/users/:id', async (req, res) => {
  const targetUser = await users.findOne({ _id: req.params.id });
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  const requesterRole = req.user.role;
  if (targetUser.role === 'owner' && requesterRole !== 'super_owner') return res.status(403).json({ error: 'Only Super Owner can modify Owners' });
  if (targetUser.role === 'admin' && !['owner', 'super_owner'].includes(requesterRole)) return res.status(403).json({ error: 'Only Owners can modify Admins' });

  const { username, password, role, is_injected } = req.body;
  
  if (role && role !== targetUser.role) {
    if (role === 'owner' && requesterRole !== 'super_owner') return res.status(403).json({ error: 'Only Super Owner can promote to Owner' });
    if (role === 'admin' && !['owner', 'super_owner'].includes(requesterRole)) return res.status(403).json({ error: 'Only Owners can promote to Admin' });
  }

  const update = {};
  if (username) update.username = username;
  if (role) update.role = role;
  if (typeof is_injected !== 'undefined') update.is_injected = !!is_injected;
  if (password) {
    update.password_hash = bcrypt.hashSync(password, 10);
    update.password_plain = password;
  }
  await users.update({ _id: req.params.id }, { $set: update });
  res.json({ ok: true });
});

router.delete('/users/:id', async (req, res) => {
  const targetUser = await users.findOne({ _id: req.params.id });
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  const requesterRole = req.user.role;
  if (targetUser.role === 'owner' && requesterRole !== 'super_owner') return res.status(403).json({ error: 'Only Super Owner can delete Owners' });
  if (targetUser.role === 'admin' && !['owner', 'super_owner'].includes(requesterRole)) return res.status(403).json({ error: 'Only Owners can delete Admins' });

  await keys.remove({ user_id: req.params.id }, { multi: true });
  await users.remove({ _id: req.params.id });
  res.json({ ok: true });
});

// --- KEYS ---
router.get('/keys', async (req, res) => {
  const allKeys = await keys.find({});
  const result = await Promise.all(allKeys.reverse().map(async k => {
    const user = k.user_id ? await users.findOne({ _id: k.user_id }) : null;
    return { ...k, username: user?.username };
  }));
  res.json(result);
});

router.post('/keys/generate', async (req, res) => {
  const { count = 1, user_id, expires_at } = req.body;
  const generated = [];
  for (let i = 0; i < Math.min(count, 100); i++) {
    const keyStr = generateKeyString();
    const doc = await keys.insert({
      key_string: keyStr,
      user_id: user_id || null,
      expires_at: expires_at ? new Date(expires_at) : null,
      status: user_id ? 'assigned' : 'available',
      created_at: new Date()
    });
    generated.push({ id: doc._id, key_string: keyStr });
  }
  res.json(generated);
});

router.put('/keys/:id', async (req, res) => {
  const { user_id, expires_at, status } = req.body;
  const update = {};
  if (user_id !== undefined) { update.user_id = user_id; update.status = 'assigned'; }
  if (expires_at !== undefined) update.expires_at = expires_at ? new Date(expires_at) : null;
  if (status) update.status = status;
  await keys.update({ _id: req.params.id }, { $set: update });
  res.json({ ok: true });
});

router.delete('/keys/:id', async (req, res) => {
  await keys.remove({ _id: req.params.id });
  res.json({ ok: true });
});

// --- LOGS ---
router.get('/logs', async (req, res) => {
  const allLogs = await logs.find({});
  res.json(allLogs.reverse().slice(0, 500));
});

// --- INJECT ---
router.post('/users/:id/inject', async (req, res) => {
  const { injected } = req.body;
  await users.update({ _id: req.params.id }, { $set: { is_injected: !!injected } });
  const user = await users.findOne({ _id: req.params.id });
  if (user) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await logs.insert({ user_id: req.params.id, username: user.username, action: injected ? 'INJECTED' : 'INJECT_REMOVED', ip: 'admin', created_at: new Date() });
  }
  res.json({ ok: true });
});

// --- REFUND ---
router.post('/refund', async (req, res) => {
  const { username, days } = req.body;
  if (!username || !days) return res.status(400).json({ error: 'Username and days required' });

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (username.toUpperCase() === 'ALL') {
    const allAssignedKeys = await keys.find({ status: 'assigned' });
    let count = 0;
    for (const key of allAssignedKeys) {
      if (key.expires_at) {
        const d = new Date(key.expires_at);
        const base = d > new Date() ? d : new Date();
        base.setDate(base.getDate() + days);
        await keys.update({ _id: key._id }, { $set: { expires_at: new Date(base.toISOString()) } });
        count++;
      }
    }
    await logs.insert({ user_id: 'SYSTEM', username: 'ALL_USERS', action: 'REFUND', ip, created_at: new Date() });
    return res.json({ ok: true, new_expiry: `Refunded ${count} keys` });
  }

  const user = await users.findOne({ username });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const key = await keys.findOne({ user_id: user._id });
  if (!key) return res.status(404).json({ error: 'No key assigned to this user' });

  // If lifetime, it stays lifetime
  let new_expiry = null;
  if (key.expires_at) {
    const d = new Date(key.expires_at);
    // If it's already expired, add days from now, else add to existing expiry
    const base = d > new Date() ? d : new Date();
    base.setDate(base.getDate() + days);
    new_expiry = base.toISOString();
    await keys.update({ _id: key._id }, { $set: { expires_at: new Date(new_expiry) } });
  }

  await logs.insert({ user_id: user._id, username: user.username, action: 'REFUND', ip, created_at: new Date() });

  res.json({ ok: true, new_expiry });
});

module.exports = router;
