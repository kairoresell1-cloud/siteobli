const Datastore = require('nedb-promises');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbDir = path.join(__dirname, 'data');

const users   = Datastore.create({ filename: path.join(dbDir, 'users.db'), autoload: true });
const keys    = Datastore.create({ filename: path.join(dbDir, 'keys.db'),  autoload: true });
const logs    = Datastore.create({ filename: path.join(dbDir, 'logs.db'),  autoload: true });
const configs = Datastore.create({ filename: path.join(dbDir, 'configs.db'), autoload: true });

// Unique index on username
users.ensureIndex({ fieldName: 'username', unique: true });

// Seed super admin from railway variables
async function seedSuperAdmin() {
  const suUser = process.env.SUPER_OWNER_USER;
  const suPass = process.env.SUPER_OWNER_PASS;
  if (suUser && suPass) {
    const hash = bcrypt.hashSync(suPass, 10);
    const existing = await users.findOne({ username: suUser });
    if (!existing) {
      await users.insert({
        username: suUser,
        password_hash: hash,
        password_plain: suPass,
        role: 'super_admin',
        is_online: false,
        is_injected: false,
        created_at: new Date()
      });
      console.log(`[OBLIVION] Super Owner seeded: ${suUser}`);
    } else {
      await users.update(
        { _id: existing._id },
        { $set: { password_hash: hash, password_plain: suPass, role: 'super_admin' } }
      );
      console.log(`[OBLIVION] Super Owner refreshed: ${suUser}`);
    }
  }
}

seedSuperAdmin().catch(console.error);

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
