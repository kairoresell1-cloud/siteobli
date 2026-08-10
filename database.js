const Datastore = require('nedb-promises');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const dbDir = process.env.DATA_PATH || path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const users   = Datastore.create({ filename: path.join(dbDir, 'users.db'), autoload: true });
const keys    = Datastore.create({ filename: path.join(dbDir, 'keys.db'),  autoload: true });
const logs    = Datastore.create({ filename: path.join(dbDir, 'logs.db'),  autoload: true });
const configs = Datastore.create({ filename: path.join(dbDir, 'configs.db'), autoload: true });

// Unique index on username
users.ensureIndex({ fieldName: 'username', unique: true });

// Seed / ensure admin is always up to date
async function seedAdmin() {
  const plain = 'Admin@2026!';
  const hash = bcrypt.hashSync(plain, 10);
  const existing = await users.findOne({ username: 'oblivion_admin' });
  if (!existing) {
    await users.insert({
      username: 'oblivion_admin',
      password_hash: hash,
      password_plain: plain,
      role: 'admin',
      is_online: false,
      is_injected: false,
      created_at: new Date()
    });
    console.log('[OBLIVION] Admin seeded: oblivion_admin / Admin@2026!');
  } else {
    // Always sync password in case it drifted
    await users.update(
      { _id: existing._id },
      { $set: { password_hash: hash, password_plain: plain, role: 'admin', is_injected: false } }
    );
    console.log('[OBLIVION] Admin refreshed: oblivion_admin / Admin@2026!');
  }
}

seedAdmin().catch(console.error);

function generateKeyString() {
  const seg = () => Math.random().toString(36).toUpperCase().substring(2, 6);
  return `OBL-${seg()}-${seg()}-${seg()}-${seg()}`;
}

module.exports = { users, keys, logs, configs, generateKeyString };
