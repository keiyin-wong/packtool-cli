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



class HtmlWebpackParameterGenerator {
    #pathList;
    #entryPointList;

    constructor(confObj, dirname, logger) {
        this.confObj = confObj;
        this.logger = logger;
        this.dirname = dirname;
        this.dirRealPath = fs.realpathSync.native(dirname);
        this.#pathList = [];
        this.logger = new WebpackLogger(logger);
        this.#entryPointList = [];
        this.#generate();
    }

    get pathList() {
        return this.#pathList;
    }

    get entryPointList() {
        return this.#entryPointList;
    }

    #validateExcludes(htmlWebPackPlugin) {
        let excludeList = [];
        this.logger.logTitle("Validate excludes file path");
        this.logger.info("Validating the excludes file path.");
        htmlWebPackPlugin.excludes?.[0].exclude.forEach((ele) => {
            if(isFileExists(this.dirname, ele)) {
                // Validate the file name case
                this.logger.debug(`Validating the exclude file name case ${ele}`);
                let validatedFileName = getFileNameWithCaseSensitive(this.dirname, ele);
                if(ele !== validatedFileName) {
                    this.logger.warn(chalk.bgYellow(`Please check the exlude file name case. The orginal filename is ${ele}. It should be ${validatedFileName}`));
                } else {
                    this.logger.debug(`Exclude file name [${ele}] passed`);
                }
                ele = validatedFileName;
            }        
            excludeList.push(ele);
        });
        if(htmlWebPackPlugin.excludes?.[0]?.exclude) {
            htmlWebPackPlugin.excludes[0].exclude = excludeList;
        }
        this.logger.info("The exludes file path pattern is %o", excludeList);
        this.logger.logSeparator();
    }
    #validateIncludes(htmlWebPackPlugin) {
        this.logger.logTitle("Validate includes file path");
        let includeList = [];
        this.logger.info("Validating the includes file path.");
        htmlWebPackPlugin.includes?.[0].include.forEach(include => {
            if(isFileExists(this.dirname,include.path[0])) {
                this.logger.debug(`Validating the include file name case ${include.path[0]}`);
                let validatedFileName = getFileNameWithCaseSensitive(this.dirname ,include.path[0]);
                if(include.path[0] !== validatedFileName) {
                    this.logger.warn(`Please check the include file name path. The orginal filename is ${include.path[0]}. It should be ${validatedFileName}`);
                    include.path[0] = validatedFileName;
                } else {
                    this.logger.debug(`Include file name case [${include.path[0]}] passed`);
                }
            }
            includeList.push(include.path[0]);
        });
        this.logger.info("The include file path pattern is %o", includeList);
        this.logger.logSeparator();
    }

    #generate() {
        this.confObj.webpack.htmlWebPackPlugin?.forEach(htmlWebPackPlugin => {
            this.#validateExcludes(htmlWebPackPlugin);
            this.#validateIncludes(htmlWebPackPlugin);

            // Html webpack plugin parameters
            this.logger.logTitle("Generate HTML webpack plugin parameter");
            this.logger.info("Converting include file path wildcard with exclude file path pattern.");
            htmlWebPackPlugin.includes[0].include.reverse().forEach(include => {
                this.logger.info(chalk.bold.magenta("Converting file path wildcard pattern [%s] to full path list", include.path[0]));
                let fileNameList = glob.sync(include.path[0], {
                    ignore: htmlWebPackPlugin.excludes?.[0].exclude ?? []
                });
                this.logger.debug("The full filename list for wildcard pattern [%s] is %o", include.path[0], fileNameList);

                fileNameList.forEach(filename => {
                    // Remove src prefix
                    let srcPrefix = include.sourceFolderPrefix?.[0] ?? (this.confObj.webpack.sourceFolderPrefix?.[0] ?? "src/");
                    let fileNameWithoutSrcPrefix = removePrefix(srcPrefix, filename);

                    // Get the real path because of windows path case insensitive
                    this.logger.debug("Generating html plugin parameter for [%s].", fileNameWithoutSrcPrefix);

                    let realPath = fs.realpathSync.native(`${this.dirRealPath}/${filename}`);
                    this.logger.debug("Real path for [%s] is [%s].", filename, realPath);

                    // Chucks
                    let chunkList = [...include.chunks[0].chunk ?? []];

                    // Include js file in entry point list
                    let jsFileName = `${filename.substring(0, filename.lastIndexOf("."))}.js`;

                    var fileNameWithoutSrcPrefixAndExt = fileNameWithoutSrcPrefix.substring(0, fileNameWithoutSrcPrefix.lastIndexOf("."));

                    // In includeSelf is true, then add to the entry list
                    if((include.chunks[0].$.includeSelf === "true" ? true: false ) ?? true) {
                        // Insert the js file to the entry list if the js file exists
                        if(isFileExists(this.dirname, jsFileName)) {
                            let jsRealFilePath = fs.realpathSync.native(`${this.dirRealPath}/${jsFileName}`);
                            let found = this.#entryPointList.find((el) => el.name === fileNameWithoutSrcPrefixAndExt);

                            if(!found) {
                                this.#entryPointList.push({
                                    name: fileNameWithoutSrcPrefixAndExt,
                                    realPath: jsRealFilePath, 
                                });
                            } else {
                                found.name = fileNameWithoutSrcPrefixAndExt;
                                found.realPath = jsRealFilePath;
                            }
                        } else { // If the js file does not exist, then remove the entry point if exists
                            let found = this.#entryPointList.find((el) => el.name === fileNameWithoutSrcPrefixAndExt);
                            if(found) {
                                this.#entryPointList = this.#entryPointList.filter(x => x.name !== fileNameWithoutSrcPrefixAndExt);
                            }
                        }
                    } else {
                        // If false, removes the entry point
                        let found = this.#entryPointList.find((el) => el.name === fileNameWithoutSrcPrefixAndExt);
                        if(found) {
                            this.#entryPointList = this.#entryPointList.filter(x => x.name !== fileNameWithoutSrcPrefixAndExt);
                        }
                    }
                    // Remove duplicates
                    chunkList = [...new Set(chunkList)];

                    // Get the object by template path, if exists then overwrite.
                    let found = this.#pathList.find(el => el.filename === fileNameWithoutSrcPrefix);

                    if(!found) {
                        this.logger.info("Inserting HTML webpack parameter to list. [%s].", fileNameWithoutSrcPrefix);
                        this.#pathList.push({
                            filename: fileNameWithoutSrcPrefix,
                            template: realPath,
                            inject: include.chunks[0].$.inject ?? "body", // If null or undefined, then return body 
                            chunks: chunkList, // If null or undefined, then return []
                            chunksSortMode: "manual",
                            scriptLoading: include.chunks[0].$.scriptLoading ?? "blocking",
                            publicPath: include.publicPath?.[0] ?? "${pageContext.request.contextPath}/", 
                            minify: false,
                            includeSelf: isFileExists(this.dirname, jsFileName) ? fs.realpathSync.native(`${this.dirRealPath}/${jsFileName}`) : null
                        });
                    } else { // If the file path exists, then overwrites it
                        this.logger.debug("Duplicate HTML webpack parameter found. %s", fileNameWithoutSrcPrefix);
                        this.logger.info(`${chalk.cyan("Overwritting")} HTML webpack parameter. [${chalk.italic.cyan("%s")}].`, filename);
                        found.filename = fileNameWithoutSrcPrefix;
                        found.template = realPath;
                        found.chunks = chunkList; // If null or undefined, then return []
                        found.inject = include.chunks[0].$.inject ?? "body"; // If null or undefined, then return body 
                        found.publicPath = include.publicPath?.[0] ?? "${pageContext.request.contextPath}/";
                        found.scriptLoading = include.chunks[0].$.scriptLoading ?? "blocking";
                        found.includeSelf = isFileExists(this.dirname, jsFileName) ? fs.realpathSync.native(`${this.dirRealPath}/${jsFileName}`) : null;
                    }
                });
                this.logger.info(chalk.bold.magenta("End of generating html parameters for %s.\n"), include.path[0]);
            });
            this.logger.debug("The html webpack parameter is %o", this.#pathList);
            this.logger.debug("The entry point list from html webpack parameter is %o", this.#entryPointList);
            this.logger.logSeparator();
        });
    }
}
module.exports = HtmlWebpackParameterGenerator;