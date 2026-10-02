const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { users, keys, logs, userConfigs, products, generateKeyString, generateToken, DEFAULT_CONFIG } = require('../database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.use(authMiddleware, adminOnly); // adminOnly allows both admin and super_admin

// ── Helper: controlla se un utente è il super owner ─────────────
function checkSuperOwner(user) {
  const soUsername = process.env.SUPER_OWNER_USERNAME;
  if (!soUsername) return false;
  return user.role === 'super_admin' && user.username === soUsername;
}

function checkTargetIsSuperOwner(target) {
  const soUsername = process.env.SUPER_OWNER_USERNAME;
  if (!soUsername) return false;
  return target.role === 'super_admin' && target.username === soUsername;
}

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
  const requester = req.user;
  const isSuperOwner = checkSuperOwner(requester);

  // Visibilità password per ruolo:
  // admin       → solo password user
  // owner       → password user + admin, NON altri owner
  // super owner → tutto
  const canSeePassword = (target) => {
    if (isSuperOwner) return true;
    if (requester.role === 'super_admin') return target.role !== 'super_admin';
    if (requester.role === 'admin') return target.role === 'user';
    return false;
  };

  const result = await Promise.all(allUsers.reverse().map(async u => {
    const { password_hash, password_plain, ...safe } = u;
    if (canSeePassword(u)) safe.password_plain = password_plain;

    const userKeys = await keys.find({ user_id: u._id });
    if (userKeys.length > 1) {
      return { ...safe, key_string: `[${userKeys.length} Keys]`, expires_at: null, key_status: 'multiple', key_id: null, game: 'multiple' };
    } else if (userKeys.length === 1) {
      const key = userKeys[0];
      return { ...safe, key_string: key.key_string, expires_at: key.expires_at, key_status: key.status, key_id: key._id, game: key.game };
    }
    return { ...safe, key_string: null, expires_at: null, key_status: null, key_id: null, game: null };
  }));
  res.json(result);
});

router.post('/users', async (req, res) => {
  const { username, password, role, expires_at } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

  // Solo super_admin può creare account Owner
  if (role === 'super_admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Only an Owner can create Owner accounts' });
  }

  const hash = bcrypt.hashSync(password, 10);
  try {
    const doc = await users.insert({
      username, password_hash: hash, password_plain: password,
      role: role || 'user', is_online: false, is_injected: false, created_at: new Date()
    });

    // Auto-seed cheat config con token
    const token = generateToken();
    await userConfigs.insert({
      user_id: doc._id,
      token,
      config: { ...DEFAULT_CONFIG },
      updated_at: new Date()
    });

    res.json({ id: doc._id, username });
  } catch (e) {
    res.status(409).json({ error: 'Username already exists' });
  }
});

router.put('/users/:id', async (req, res) => {
  const { username, password, role, is_injected } = req.body;

  const target = await users.findOne({ _id: req.params.id });
  if (!target) return res.status(404).json({ error: 'User not found' });

  const requester = req.user;
  const isSuperOwner = checkSuperOwner(requester);
  const targetIsSuperOwner = checkTargetIsSuperOwner(target);

  // Super owner è INTOCCABILE — nessuno può modificarlo tranne se stesso
  if (targetIsSuperOwner && String(target._id) !== String(requester._id)) {
    return res.status(403).json({ error: 'The Super Owner account cannot be modified' });
  }

  // Admin può modificare solo user
  if (requester.role === 'admin' && target.role !== 'user') {
    return res.status(403).json({ error: 'Admins can only edit regular users' });
  }

  // Owner può modificare chiunque tranne il super owner (già bloccato sopra)

  const update = {};
  if (username) update.username = username;
  if (role) {
    // Blocca promozione a Owner solo se il target NON è già Owner — evita il falso blocco
    const isNewPromotion = role === 'super_admin' && target.role !== 'super_admin';
    if (isNewPromotion && !isSuperOwner) {
      return res.status(403).json({ error: 'Only the Super Owner can promote to Owner' });
    }
    update.role = role;
  }
  if (typeof is_injected !== 'undefined') update.is_injected = !!is_injected;
  if (password) {
    update.password_hash = bcrypt.hashSync(password, 10);
    update.password_plain = password;
  }
  await users.update({ _id: req.params.id }, { $set: update });
  res.json({ ok: true });
});

router.delete('/users/:id', async (req, res) => {
  const target = await users.findOne({ _id: req.params.id });
  if (!target) return res.status(404).json({ error: 'User not found' });

  const requester = req.user;
  const targetIsSuperOwner = checkTargetIsSuperOwner(target);

  // Super owner è IMPOSSIBILE da eliminare — nessuno, nemmeno se stesso
  if (targetIsSuperOwner) {
    return res.status(403).json({ error: 'The Super Owner account cannot be deleted' });
  }

  // Admin può eliminare solo user
  if (requester.role === 'admin' && target.role !== 'user') {
    return res.status(403).json({ error: 'Admins can only delete regular users' });
  }

  // Owner può eliminare chiunque tranne il super owner (già bloccato sopra)

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
  const { count = 1, user_id, expires_at, game } = req.body;
  const generated = [];
  for (let i = 0; i < Math.min(count, 100); i++) {
    const keyStr = generateKeyString();
    const doc = await keys.insert({
      key_string: keyStr,
      game: game || 'global',
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

  let new_expiry = null;
  if (key.expires_at) {
    const d = new Date(key.expires_at);
    const base = d > new Date() ? d : new Date();
    base.setDate(base.getDate() + days);
    new_expiry = base.toISOString();
    await keys.update({ _id: key._id }, { $set: { expires_at: new Date(new_expiry) } });
  }

  await logs.insert({ user_id: user._id, username: user.username, action: 'REFUND', ip, created_at: new Date() });

  res.json({ ok: true, new_expiry });
});

module.exports = router;
