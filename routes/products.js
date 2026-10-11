const express = require('express');
const router = express.Router();
const { products } = require('../database');

// GET /api/products — public, anyone can see
router.get('/', async (req, res) => {
  try {
    const all = await products.find({});
    // sort by order then by date descending
    all.sort((a, b) => (a.order || 0) - (b.order || 0) || new Date(b.created_at) - new Date(a.created_at));
    res.json(all);
  } catch (e) {
    console.error('[PRODUCTS] GET error:', e);
    res.status(500).json({ error: 'DB error' });
  }
});

module.exports = router;
