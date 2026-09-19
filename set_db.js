const db = require('./database');
async function run() {
    await db.userConfigs.update({token: '567f146dd71b59579abcdb3fda9706c81efe87330690c229dec90bb42416a359'}, {$set: {'config.esp_enable': true, 'config.esp_box_enable': true, 'config.esp_ignore_npc': false}});
    console.log('DB Updated');
}
run();
