const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

var separator = "---------------------------------------------------------------------------";
class WebpackLogger {
    constructor(logger) {
        this.logger = logger;
    }
    info(message, ...args) {
        this.logger.info(message, ...args);
    }
    warn(message, ...args) {
        this.logger.warn(message, ...args);
    }
    error(message, ...args) {
        this.logger.error(message, ...args);
    }
    debug(message, ...args) {
        this.logger.debug(message, ...args);
    }
    logTitle(title) {
        this.logLine();
        this.logger.info(chalk.bold.green(title));
        this.logLine();
    }
    logLine(value) {
        this.logger.info(chalk.bold.green(separator + (value ?? "")));
    }
    logSeparator() {
        this.logLine("\n\n");
    }
}

function isFileExists(dirname, filename) {
    return fs.existsSync(path.join(dirname, filename));
}

function getFileNameWithCaseSensitive(dirRealPath, filename) {
    let realPath = fs.realpathSync.native(`${dirRealPath}/${filename}`);
    let realPathWithSlash = replaceDoubleBackSlashWithForwardSlash(realPath);
    let fileNameCaseSensitive = removePrefix(
        replaceDoubleBackSlashWithForwardSlash(`${dirRealPath}/`),
        realPathWithSlash
    );
    return fileNameCaseSensitive;
}

// Remove the prefix
function removePrefix(prefix, filename) {
    prefix = replaceDoubleBackSlashWithForwardSlash(prefix);
    filename = replaceDoubleBackSlashWithForwardSlash(filename);

    if(filename.startsWith(prefix)) {
        filename = filename.slice(prefix.length);
    }
    return filename;
}

function replaceDoubleBackSlashWithForwardSlash(value) {
    return value.replace(/\\/g, "/");
}

function replaceForwardSlashWithDoubleBackSlash(value) {
    return value.replace("/\//g", "\\")
}

module.exports = {
    WebpackLogger, 
    isFileExists, 
    getFileNameWithCaseSensitive,
    removePrefix,
    replaceDoubleBackSlashWithForwardSlash,
    replaceForwardSlashWithDoubleBackSlash,
    separator
}