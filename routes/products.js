const express = require('express');
const router = express.Router();
const { products } = require('../database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// GET /api/products — pubblico, tutti possono vedere i prodotti
router.get('/', async (req, res) => {
  try {
    const all = await products.find({}).sort({ order: 1, created_at: -1 });
    res.json(all);
  } catch (e) {
    res.status(500).json({ error: 'DB error' });
  }
});

// POST /api/admin/products — solo admin aggiunge prodotto
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  const { title, description, image_url, discord_url, order } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  try {
    const doc = await products.insert({
      title,
      description: description || '',
      image_url: image_url || '',
      discord_url: discord_url || 'https://discord.gg/forte',
      order: order || 0,
      created_at: new Date()
    });
    res.json({ ok: true, product: doc });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/admin/products/:id — modifica prodotto
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  const { title, description, image_url, discord_url, order } = req.body;
  try {
    await products.update(
      { _id: req.params.id },
      { $set: { title, description, image_url, discord_url, order } }
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/admin/products/:id — elimina prodotto
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await products.remove({ _id: req.params.id });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
