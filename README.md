# OBLIVION — Cheat Dashboard

Premium web dashboard for the Oblivion cheat. Built with Node.js + Express + SQLite.

## Features
- 🔐 JWT Auth with role-based access (user / admin)
- 📊 User dashboard — username, password, key expiry countdown
- ⚙️ Settings — Visual ESP, Aimbot, Silent Aim, Triggerbot, Misc
- 🎨 Theme switcher (Default + Blood Moon)
- 🛡️ Admin panel — stats, user management, key generation, logs

## Quick Start

```bash
npm install
node server.js
```

Open `http://localhost:3000`

Default admin: `oblivion_admin` / `Admin@2026!`

## Deploy to Railway

1. Push to GitHub
2. Create new Railway project → Deploy from GitHub
3. Set env var `JWT_SECRET` to a long random string
4. Done — Railway handles the rest

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `JWT_SECRET` | `oblivion_super_secret_key_2026` | JWT signing secret (CHANGE THIS) |
