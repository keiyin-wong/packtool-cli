const PLUGIN_NAME = 'TimeLoggerPlugin';
const chalk = require('chalk');

class TimeLoggerPlugin {
    apply(compiler) {

        compiler.hooks.done.tapAsync(PLUGIN_NAME, (compilation, callback) => {
            callback();
            console.log(`[Message from ${PLUGIN_NAME}] Compilation Done ${chalk.bold.green(new Date().toLocaleString())}`);
        });
    }
}

module.exports = TimeLoggerPlugin;