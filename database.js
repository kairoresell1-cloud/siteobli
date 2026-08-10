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



function generateKeyString() {
  const seg = () => Math.random().toString(36).toUpperCase().substring(2, 6);
  return `OBL-${seg()}-${seg()}-${seg()}-${seg()}`;
}

module.exports = { users, keys, logs, configs, generateKeyString };
