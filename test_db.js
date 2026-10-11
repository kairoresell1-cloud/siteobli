const { userConfigs } = require('./database');
async function run() {
    const configs = await userConfigs.find({});
    console.log(configs);
}
run();
