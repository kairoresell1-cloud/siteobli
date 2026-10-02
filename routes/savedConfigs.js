const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const db = require('../database');

// Assicura che la collection savedConfigs esista
const getSaved = () => db.db.collection('savedConfigs');

router.use(authMiddleware);

// GET /api/saved/my — configs personali dell'utente loggato
router.get('/my', async (req, res) => {
  try {
    const col = getSaved();
    const docs = await col.find({ user_id: req.user._id }).toArray();
    docs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    // Arricchisci con username
    res.json(docs.map(d => ({ ...d, username: req.user.username })));
  } catch (e) {
    console.error('[SAVED] GET my error:', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/saved/public — tutte le configs pubbliche
router.get('/public', async (req, res) => {
  try {
    const col = getSaved();
    const docs = await col.find({ is_public: true }).toArray();
    docs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Join username
    const users = db.users;
    const result = await Promise.all(docs.map(async d => {
      let username = 'Unknown';
      try {
        const u = await users.find({ _id: d.user_id });
        if (u && u.length > 0) username = u[0].username;
      } catch (_) {}
      return { ...d, username };
    }));
    res.json(result);
  } catch (e) {
    console.error('[SAVED] GET public error:', e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/saved — salva una config
router.post('/', async (req, res) => {
  try {
    const { name, is_public, config } = req.body;
    if (!name || !config) return res.status(400).json({ error: 'name and config required' });
    const col = getSaved();
    const doc = await col.insertOne({
      user_id: req.user._id,
      name: name.trim().slice(0, 64),
      is_public: !!is_public,
      config,
      created_at: new Date()
    });
    res.json({ ok: true, id: doc.insertedId });
  } catch (e) {
    console.error('[SAVED] POST error:', e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/saved/:id/load — carica una config salvata nel profilo utente
router.post('/:id/load', async (req, res) => {
  try {
    const { ObjectId } = require('mongodb');
    const col = getSaved();
    const saved = await col.findOne({ _id: new ObjectId(req.params.id) });
    if (!saved) return res.status(404).json({ error: 'Config not found' });

    // Controlla accesso: propria config o pubblica
    if (!saved.is_public && String(saved.user_id) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Applica la config al profilo cheat dell'utente
    const userConfigs = db.userConfigs;
    const existing = await userConfigs.find({ user_id: req.user._id });
    if (existing && existing.length > 0) {
      await userConfigs.update(
        { user_id: req.user._id },
        { $set: { config: saved.config, updated_at: new Date() } }
      );
    } else {
      await userConfigs.insert({
        user_id: req.user._id,
        config: saved.config,
        updated_at: new Date()
      });
    }
    res.json({ ok: true });
  } catch (e) {
    console.error('[SAVED] LOAD error:', e);
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/saved/:id — elimina una config (solo propria)
router.delete('/:id', async (req, res) => {
  try {
    const { ObjectId } = require('mongodb');
    const col = getSaved();
    const saved = await col.findOne({ _id: new ObjectId(req.params.id) });
    if (!saved) return res.status(404).json({ error: 'Not found' });
    if (String(saved.user_id) !== String(req.user._id) && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    await col.deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ ok: true });
  } catch (e) {
    console.error('[SAVED] DELETE error:', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
