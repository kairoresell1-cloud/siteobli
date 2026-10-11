const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { users, keys, logs, userConfigs, products, generateKeyString, generateToken, DEFAULT_CONFIG } = require('../database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.use(authMiddleware, adminOnly);

// ── Super owner helpers ──────────────────────────────────────────
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

// ── Log helper ───────────────────────────────────────────────────
async function addLog({ action, actor, target, detail }) {
  try {
    await logs.insert({
      action,
      username: target || actor || 'SYSTEM',
      actor: actor || null,
      target: target || null,
      detail: detail || null,
      created_at: new Date()
    });
  } catch (_) {}
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

  const canSeePassword = (target) => {
    if (isSuperOwner) return true;
    if (requester.role === 'super_admin') return target.role !== 'super_admin';
    if (requester.role === 'admin') return target.role === 'user';
    return false;
  };

  const result = await Promise.all(allUsers.reverse().map(async u => {
    const { password_hash, password_plain, ...safe } = u;
    if (canSeePassword(u)) safe.password_plain = password_plain;
    // Flag per il frontend: sa chi è il super owner senza esporre il nome dell'env var
    safe.is_super_owner = checkTargetIsSuperOwner(u);
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
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

  // Admin può creare solo user — non altri admin o owner
  if (req.user.role === 'admin' && role && role !== 'user') {
    return res.status(403).json({ error: 'Admins can only create regular user accounts' });
  }

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

    const token = generateToken();
    await userConfigs.insert({ user_id: doc._id, token, config: { ...DEFAULT_CONFIG }, updated_at: new Date() });

    await addLog({
      action: 'USER_CREATED',
      actor: req.user.username,
      target: doc.username,
      detail: `Role: ${doc.role}`
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

  if (targetIsSuperOwner && String(target._id) !== String(requester._id)) {
    return res.status(403).json({ error: 'The Super Owner account cannot be modified' });
  }
  if (requester.role === 'admin' && target.role !== 'user') {
    return res.status(403).json({ error: 'Admins can only edit regular users' });
  }

  const update = {};
  if (username) update.username = username;
  if (role) {
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

  const changes = [];
  if (username) changes.push(`username→${username}`);
  if (role) changes.push(`role→${role}`);
  if (password) changes.push('password changed');
  await addLog({
    action: 'USER_EDITED',
    actor: requester.username,
    target: target.username,
    detail: changes.join(', ') || 'no changes'
  });

  res.json({ ok: true });
});

router.delete('/users/:id', async (req, res) => {
  const target = await users.findOne({ _id: req.params.id });
  if (!target) return res.status(404).json({ error: 'User not found' });

  const requester = req.user;
  const targetIsSuperOwner = checkTargetIsSuperOwner(target);

  if (targetIsSuperOwner) return res.status(403).json({ error: 'The Super Owner account cannot be deleted' });
  if (requester.role === 'admin' && target.role !== 'user') {
    return res.status(403).json({ error: 'Admins can only delete regular users' });
  }

  await addLog({
    action: 'USER_DELETED',
    actor: requester.username,
    target: target.username,
    detail: `Was: ${target.role}`
  });

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

  // Log key creation
  let targetUsername = null;
  if (user_id) {
    const u = await users.findOne({ _id: user_id });
    targetUsername = u ? u.username : `id:${user_id}`;
  }
  await addLog({
    action: 'KEY_CREATED',
    actor: req.user.username,
    target: targetUsername,
    detail: `${generated.length} key(s) — game: ${game || 'global'}${expires_at ? ` — expires: ${new Date(expires_at).toLocaleDateString('it-IT')}` : ' — lifetime'}`
  });

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
  allLogs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(allLogs.slice(0, 1000).map(l => ({
    _id: l._id,
    username: l.username,
    action: l.action,
    actor: l.actor || null,
    target: l.target || null,
    detail: l.detail || null,
    created_at: l.created_at
  })));
});

// --- INJECT ---
router.post('/users/:id/inject', async (req, res) => {
  const { injected } = req.body;
  await users.update({ _id: req.params.id }, { $set: { is_injected: !!injected } });
  const user = await users.findOne({ _id: req.params.id });
  if (user) {
    await addLog({
      action: injected ? 'INJECTED' : 'INJECT_REMOVED',
      actor: req.user.username,
      target: user.username,
      detail: injected ? 'Inject set by admin' : 'Inject removed by admin'
    });
  }
  res.json({ ok: true });
});

// --- REFUND ---
router.post('/refund', async (req, res) => {
  const { username, days } = req.body;
  if (!username || !days) return res.status(400).json({ error: 'Username and days required' });

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
    await addLog({ action: 'REFUND', actor: req.user.username, target: 'ALL_USERS', detail: `+${days} days on ${count} keys` });
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

  await addLog({ action: 'REFUND', actor: req.user.username, target: user.username, detail: `+${days} days` });
  res.json({ ok: true, new_expiry });
});

module.exports = router;
