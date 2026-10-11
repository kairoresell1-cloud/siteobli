const Datastore = require('nedb-promises');
const path = require('path');
const dbDir = 'C:\\Users\\luigi\\Downloads\\sito oblivion\\sito oblivion\\data';
const configs = Datastore.create({ filename: path.join(dbDir, 'configs.db'), autoload: true });
const userConfigs = Datastore.create({ filename: path.join(dbDir, 'userconfigs.db'), autoload: true });

async function fix() {
  const allCfgs = await configs.find({});
  for(let c of allCfgs) {
    let update = false;
    if(c.overlay_monitor === undefined) { c.overlay_monitor = 1; update = true; }
    if(c.aimbot_show_fov === undefined) { c.aimbot_show_fov = false; update = true; }
    if(c.silent_show_fov === undefined) { c.silent_show_fov = false; update = true; }
    if(c.triggerbot_show_fov === undefined) { c.triggerbot_show_fov = false; update = true; }
    if(c.triggerbot_key_mode === undefined) { c.triggerbot_key_mode = 0; update = true; }
    
    if(update) await configs.update({_id: c._id}, c);
  }
  
  const allUserCfgs = await userConfigs.find({});
  for(let uc of allUserCfgs) {
    if(uc.config) {
        let update = false;
        let c = uc.config;
        if(c.overlay_monitor === undefined) { c.overlay_monitor = 1; update = true; }
        if(c.aimbot_show_fov === undefined) { c.aimbot_show_fov = false; update = true; }
        if(c.silent_show_fov === undefined) { c.silent_show_fov = false; update = true; }
        if(c.triggerbot_show_fov === undefined) { c.triggerbot_show_fov = false; update = true; }
        if(c.triggerbot_key_mode === undefined) { c.triggerbot_key_mode = 0; update = true; }
        
        if(update) await userConfigs.update({_id: uc._id}, uc);
    }
  }
  console.log('Fixed DB entries');
}

fix();
