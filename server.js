const express = require('express');
const path = require('path');
const db = require('./database');
const { authMiddleware, adminOnly } = require('./middleware/auth');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- EXISTING API ROUTES ---
app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/user'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/configs', require('./routes/config'));
app.use('/api', require('./routes/cheatConfig'));

// --- PRODUCTS API (inline, no separate router) ---

// Public: anyone can list products
app.get('/api/products', async (req, res) => {
  try {
    const all = await db.products.find({});
    all.sort((a, b) => (a.order || 0) - (b.order || 0));
    res.json(all);
  } catch (e) {
    console.error('[PRODUCTS] GET error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Admin: add product
app.post('/api/admin/products', authMiddleware, adminOnly, async (req, res) => {
  console.log('[PRODUCTS] POST body:', JSON.stringify(req.body));
  try {
    const { title, description, image_url, discord_url } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    const doc = await db.products.insert({
      title: title,
      description: description || '',
      image_url: image_url || '',
      discord_url: discord_url || '',
      order: 0,
      created_at: new Date()
    });
    console.log('[PRODUCTS] Created:', doc._id);
    res.json({ ok: true, product: doc });
  } catch (e) {
    console.error('[PRODUCTS] POST error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Admin: update product
app.put('/api/admin/products/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { title, description, image_url, discord_url } = req.body;
    await db.products.update({ _id: req.params.id }, { $set: { title, description, image_url, discord_url } });
    res.json({ ok: true });
  } catch (e) {
    console.error('[PRODUCTS] PUT error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Admin: delete product
app.delete('/api/admin/products/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.products.remove({ _id: req.params.id }, {});
    res.json({ ok: true });
  } catch (e) {
    console.error('[PRODUCTS] DELETE error:', e);
    res.status(500).json({ error: e.message });
  }
});

// DEBUG: test endpoint - NO AUTH - visit in browser to test DB
app.get('/api/debug/products', async (req, res) => {
  try {
    // Create a test product
    const doc = await db.products.insert({
      title: 'TEST PRODUCT',
      description: 'If you see this, the DB works',
      image_url: '',
      discord_url: 'https://discord.gg/test',
      order: 0,
      created_at: new Date()
    });
    // Read all products
    const all = await db.products.find({});
    res.json({ ok: true, created: doc, total: all.length, all: all });
  } catch (e) {
    res.json({ ok: false, error: e.message, stack: e.stack });
  }
});

// --- PAGE ROUTES ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'home.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/configs', (req, res) => res.sendFile(path.join(__dirname, 'public', 'configs.html')));
app.get('/products', (req, res) => res.sendFile(path.join(__dirname, 'public', 'products.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n  ██████  ██████  ██      ██ ██    ██ ██  ██████  ███    ██`);
  console.log(`  ██  ██  ██  ██  ██      ██ ██    ██ ██ ██    ██ ████   ██`);
  console.log(`  ██  ██  ██████  ██      ██  ██  ██  ██ ██    ██ ██ ██  ██`);
  console.log(`  ██  ██  ██  ██  ██      ██   ████   ██ ██    ██ ██  ██ ██`);
  console.log(`  ██████  ██████  ███████ ██    ██    ██  ██████  ██   ████\n`);
  console.log(`  🔮 Oblivion running on http://localhost:${PORT}`);
});
