const express = require('express');
const router = express.Router();
const { configs, users } = require('../database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/configs - Return all public configs + user's private configs
router.get('/', async (req, res) => {
  const allConfigs = await configs.find({ $or: [{ is_public: true }, { user_id: req.user.id }] });
  
  // Join usernames
  const result = await Promise.all(allConfigs.map(async c => {
    const user = await users.findOne({ _id: c.user_id });
    return { ...c, username: user ? user.username : 'Unknown' };
  }));
  
  // Sort by date descending
  result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(result);
});

// POST /api/configs - Create a new config
router.post('/', async (req, res) => {
  const { name, data, is_public } = req.body;
  if (!name || !data) return res.status(400).json({ error: 'Missing name or data' });

  const newConfig = await configs.insert({
    user_id: req.user.id,
    name,
    data,
    is_public: !!is_public,
    created_at: new Date()
  });

  res.json(newConfig);
});

// DELETE /api/configs/:id - Delete a config (only if owner)
router.delete('/:id', async (req, res) => {
  const config = await configs.findOne({ _id: req.params.id });
  if (!config) return res.status(404).json({ error: 'Not found' });
  if (config.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await configs.remove({ _id: req.params.id });
  res.json({ ok: true });
});

module.exports = router;
