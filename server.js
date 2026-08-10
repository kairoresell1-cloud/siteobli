const express = require('express');
const path = require('path');
require('./database'); // init DB + seed

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- API ROUTES ---
app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/user'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/configs', require('./routes/config'));

// --- PAGE ROUTES ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'home.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/settings', (req, res) => res.sendFile(path.join(__dirname, 'public', 'settings.html')));
app.get('/configs', (req, res) => res.sendFile(path.join(__dirname, 'public', 'configs.html')));
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
