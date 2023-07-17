const fs = require('fs');
const path = require('path');
const {
    WebpackLogger,
    isFileExists,
    getFileNameWithCaseSensitive,
    removePrefix,
    separator
} = require("./WebpackUtils");
const glob = require('glob');
const chalk = require('chalk');

class EntryPointParameterGenerator {
    #entryPointList;
    constructor(confObj, dirname, logger, entryPointList) {
        this.confObj = confObj;
        this.logger = logger;
        this.dirname = dirname;
        this.dirRealPath = fs.realpathSync.native(dirname);
        this.logger = new WebpackLogger(logger);
        this.#entryPointList = entryPointList ?? [];
        this.#generate();
    }

    get entryPointList() {
        return this.#entryPointList;
    }

    #validateEntryPointExclude(exclude) {
        let excludeList = [];
        // Handle the exclude
        // This is because glob ignor is case sensitive and sync is case insensitive
    
        this.logger.logTitle("Validate entry's excludes file path");
        this.logger.info("Validating entry the excludes file path.");
    
        this.confObj.webpack.entry[0].excludes?.[0].exclude.forEach((ele) => {
            if(isFileExists(this.dirname, ele)) {
                // Validate the file name case
                this.logger.debug(`Validating the entry exclude file name case ${ele}`);
                let validatedFileName = getFileNameWithCaseSensitive(this.dirRealPath, ele);
                if(ele !== validatedFileName) {
                    this.logger.warn(chalk.bgYellow(`Please check the exlude file name case. The orginal filename is ${ele}. It should be ${validatedFileName}`));
                } else {
                    this.logger.debug(`Exclude file name [${ele}] passed`);
                }
                ele = validatedFileName;
            }        
            excludeList.push(ele);
        })
        if(this.confObj.webpack.entry[0].excludes?.[0].exclude) {
            this.confObj.webpack.entry[0].excludes[0].exclude = excludeList;
        }
        this.logger.info("The entry's exludes file path pattern is %o", excludeList);
        this.logger.logSeparator();
    }

    #validateEntryPointInclude(include) {
        let includeList = [];
        // Validate the entry file name
        this.logger.logTitle("Validate entry's includes file path")
        this.logger.info("Validating the entry's includes file path.");
        
        this.confObj.webpack.entry[0].includes[0].include.forEach((include) => {
            if(isFileExists(this.dirname, include.path[0])) {
                this.logger.debug(`Validating the entry's include file name case ${include.path[0]}`);
                let validatedFileName = getFileNameWithCaseSensitive(this.dirRealPath, include.path[0]);
                if(include.path[0] !== validatedFileName) {
                    this.logger.warn(chalk.bgYellow(`Please check the entry include file name path. The orginal filename is ${include.path[0]}. It should be ${validatedFileName}`));
                    include.path[0] = validatedFileName;
                } else {
                    this.logger.debug(`Include entry file name case [${include.path[0]}] passed`);
                }
            }
            includeList.push(include.path[0]);
            this.logger.info("The include file path pattern is %o", includeList);
        });
        this.logger.logSeparator();
    }

    #generate() {
        this.#validateEntryPointExclude();
        this.#validateEntryPointInclude();

        this.logger.logTitle("Generate entry's point parameter ");
        this.logger.info("Converting include file path wildcard with exclude file path pattern.");

        this.confObj.webpack.entry[0].includes[0].include.reverse().forEach((include) => {
            this.logger.info(chalk.bold.magenta("Converting entry's file path wildcard pattern [%s] to full path list", include.path[0]));
            let fileNameList = glob.sync(
                include.path[0], 
                {ignore: this.confObj.webpack.entry[0].excludes?.[0].exclude ?? []}
            );
            this.logger.debug("The full filename list for wildcard pattern [%s] is %o", include.path[0], fileNameList);
    
            fileNameList.forEach((filename) => {
                // Get the real path because of windows path case insensitive
                this.logger.debug("Generating html plugin parameter for [%s].", filename);

                let realPath = fs.realpathSync.native(`${this.dirRealPath}/${filename}`);
                this.logger.debug("Real path for [%s] is [%s].", filename, realPath);
    
                // Remove src prefix
                let srcPrefix = this.confObj.webpack.sourceFolderPrefix?.[0] ?? "src/";
                let fileNameWithoutSrcPrefix = removePrefix(srcPrefix, filename);
    
                let found = this.#entryPointList.find((el) => el.realPath === realPath);
    
                if(!found) {
                    this.logger.info("Inserting entry parameter to list for. [%s].", realPath);

                    // If no output path, then based on the path in src
                    if((include.outputPath?.[0].length >= 0)?? false) {
                        // Custom location
                        // Get the file name
                        let pureFileName = path.parse(filename).name;
                        // If empty the no prefix
                        this.#entryPointList.push({
                            name: `${include.outputPath[0]}${pureFileName}`,
                            realPath: realPath, 
                            injectHead: include.injectHead?.[0] === "true" ?? false
                        });
                    } else {
                        let pureFileName = path.parse(filename).name;
                        this.#entryPointList.push({
                            name: `${pureFileName}`, // Filename without extension
                            realPath: realPath, 
                            injectHead: include.injectHead?.[0] === "true" ?? false
                        });
                    }
                } else {
                    this.logger.debug("Duplicate entry parameter found.", realPath);
                    this.logger.info("Overwritting entry parameter. [%s].", realPath);
    
                    if((include.outputPath?.[0].length >= 0)?? false) {
                        let pureFileName = path.parse(filename).name;
                        found.name = `${include.outputPath[0]}${pureFileName}`;
                        found.realPath = realPath;
                        found.injectHead = include.injectHead?.[0] === "true" ?? false;
                    } else {
                        found.name = fileNameWithoutSrcPrefix.substr(
                            0, fileNameWithoutSrcPrefix.lastIndexOf("."));
                        found.realPath = realPath;
                        found.injectHead = include.injectHead?.[0] === "true" ?? false;
                    }
                }
            });
            this.logger.info(
                chalk.bold.magenta("End of generating entry parameter for %s.\n"),
                include.path[0]);
        });
        this.logger.debug("The entry point list is %o", this.#entryPointList);
        this.logger.logSeparator();
    }
}

module.exports = EntryPointParameterGenerator;