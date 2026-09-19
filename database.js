const Datastore = require('nedb-promises');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbDir = path.join(__dirname, 'data');

const users       = Datastore.create({ filename: path.join(dbDir, 'users.db'),       autoload: true });
const keys        = Datastore.create({ filename: path.join(dbDir, 'keys.db'),        autoload: true });
const logs        = Datastore.create({ filename: path.join(dbDir, 'logs.db'),        autoload: true });
const configs     = Datastore.create({ filename: path.join(dbDir, 'configs.db'),     autoload: true });
const userConfigs = Datastore.create({ filename: path.join(dbDir, 'userconfigs.db'), autoload: true });

userConfigs.ensureIndex({ fieldName: 'user_id', unique: true });
userConfigs.ensureIndex({ fieldName: 'token',   unique: true });

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

function generateToken() {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex'); // 64-char hex
}

const DEFAULT_CONFIG = {
  silent_key:0, silent_key_mode:0, silent_enable:false, silent_distance:200, silent_fov:70,
  silent_bone_head:true, silent_bone_neck:true, silent_bone_chest:true,
  silent_bone_leftfoot:true, silent_bone_rightfoot:true, silent_bone_righthand:true, silent_bone_lefthand:true,
  silent_dynamic_fov:false, silent_miss_chance:0.0, silent_ignore_dead:true,
  silent_ignore_invisible:true, silent_ignore_friends:true, silent_magic:false, silent_thread_delay:100,
  aimbot_key:0, aimbot_key_mode:0, aimbot_enable:false, aimbot_distance:200, aimbot_fov:5,
  aimbot_bone_head:true, aimbot_bone_neck:true, aimbot_bone_chest:true,
  aimbot_bone_leftfoot:true, aimbot_bone_rightfoot:true, aimbot_bone_righthand:true, aimbot_bone_lefthand:true,
  aimbot_smoothness:10, aimbot_ignore_dead:true, aimbot_ignore_invisible:true,
  aimbot_ignore_friends:true, aimbot_thread_delay:1,
  triggerbot_key:0, triggerbot_enable:false, triggerbot_distance:200, triggerbot_fov:70,
  triggerbot_bone_head:true, triggerbot_bone_neck:true, triggerbot_bone_chest:true,
  triggerbot_bone_leftfoot:true, triggerbot_bone_rightfoot:true, triggerbot_bone_righthand:true, triggerbot_bone_lefthand:true,
  triggerbot_delay:50, triggerbot_crosshair_tolerance:15.0, triggerbot_thread_delay:5,
  triggerbot_ignore_dead:true, triggerbot_ignore_invisible:true, triggerbot_ignore_friends:true,
  triggerbot_ignore_npc:true, triggerbot_only_visible:true,
    esp_name_color:'#ffffff', esp_id_color:'#ffffff', esp_distance_color:'#ffffff', esp_weapon_color:'#ffffff',
  esp_box_color:'#ffffff', esp_skeleton_color:'#ffffff', esp_head_color:'#ffffff', esp_healthbar_color:'#00ff00', esp_armorbar_color:'#007fff',
  esp_enable:false, esp_distance:200, esp_show_local_player:false, esp_ignore_dead:false, esp_ignore_npc:true,
  esp_box_enable:false, esp_box_size:10, esp_box_type:0, esp_box_line_type:0, esp_box_line_thickness:1.0,
  esp_skeleton_enable:false, esp_skeleton_line_thickness:1.0,
  esp_head_enable:false, esp_head_size:15.0, esp_head_line_thickness:1.0,
  esp_name_enable:false, esp_name_placement:0,
  esp_id_enable:false, esp_id_placement:0,
  esp_distance_enable:false, esp_distance_placement:0,
  esp_weapon_enable:false, esp_weapon_placement:0,
  esp_healthbar_enable:false, esp_healthbar_placement:0,
  esp_healthtext_enable:false, esp_healthtext_placement:0,
  esp_armorbar_enable:false, esp_armorbar_placement:0,
  esp_armortext_enable:false, esp_armortext_placement:0,
  esp_snapline_enable:false, esp_snapline_thickness:1.0, esp_snapline_placement:0,
  esp_offscreen_enable:false, esp_offscreen_range:100.0,
  radar_enable:false, radar_range:100, radar_size:200, radar_position:0,
  radar_show_players:true, radar_show_vehicles:true, radar_show_names:false, radar_show_distance:false,
  radar_show_direction:true, radar_circle_style:false, radar_show_waves:true, radar_animate_waves:true,
  streamproof:true,
  triggerbot_key_mode:0,
  overlay_monitor:1,
  aimbot_show_fov:false,
  silent_show_fov:false,
  triggerbot_show_fov:false,

};

module.exports = { users, keys, logs, configs, userConfigs, generateKeyString, generateToken, DEFAULT_CONFIG };
