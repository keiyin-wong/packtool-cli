const path = require('path');
const HtmlWebpackParameterGenerator = require('./HtmlWebpackPlugParameterGenerator')
const EntryPointParameterGenerator = require('./EntryPointParameterGenerator')
const HtmlWebpackPlugin = require("html-webpack-plugin");
const {
    WebpackLogger,
    isFileExists,
    getFileNameWithCaseSensitive,
    removePrefix,
    separator
} = require("./WebpackUtils");

class WebpackGenerator {
    #confObj;
    #dirname;
    #logger;
    #htmlWebpackPluginParameters;
    #entryPointParameters;

    #htmlWebPackPluginList;
    #entryObj;
    #loaders;

    constructor(confObj, dirname, logger) {
        this.#confObj = confObj;
        this.#dirname = dirname;
        this.#logger = new WebpackLogger(logger);
        this.#htmlWebPackPluginList = [];
        this.#entryObj = {};
        this.#loaders = [];

        let htmlWebPackPluginParameterGenerator = new HtmlWebpackParameterGenerator(confObj, dirname, logger);
        this.#htmlWebpackPluginParameters = htmlWebPackPluginParameterGenerator.pathList;

        let entryPointList = htmlWebPackPluginParameterGenerator.entryPointList;
        let entryPointParameterGenerator = new EntryPointParameterGenerator(
            confObj, dirname, logger, entryPointList);
        this.#entryPointParameters = entryPointParameterGenerator.entryPointList;

        this.#generateHtmlWebpackPlugins();
        this.#generateEntryModule();
        this.#generateLoaders();
    }

    get htmlWebPackPluginList() {
        return this.#htmlWebPackPluginList;
    } 
    get entryObj() {
        return this.#entryObj;
    }

    get loaders() {
        return this.#loaders;
    }

    #generateHtmlWebpackPlugins() {
        this.#logger.logTitle("Generate HTML Webpack Plugin");
        this.#logger.info("Generating HTML Webpack Plugin List")
        this.#htmlWebPackPluginList = this.#htmlWebpackPluginParameters.map((ele) => {

            let chuckList = [];
            ele.chunks.forEach((chunk) => {
                // If the head is true
                let found = this.#entryPointParameters.find((el) => el.name === chunk);

                if(found?.injectHead) {
                    chuckList.push(`${found.name}_head`);
                }else {
                    chuckList.push(chunk);
                }
            });
            ele.chunks = chuckList;

            if(ele.includeSelf != null) {
                let found = this.#entryPointParameters.find((el) => el.realPath === ele.includeSelf);
                if(found) {
                    ele.chunks.push(found.name);
                }
            }

            return new HtmlWebpackPlugin({
                filename: ele.filename,
                template: ele.template,
                inject: ele.inject,
                scriptLoading: ele.scriptLoading,
                chunks: ele.chunks,
                chunksSortMode: ele.chunksSortMode,
                publicPath: ele.publicPath,
                minify: false, // For html content better to be false.
                // minify: {
                //     caseSensitive: true
                // } // https://github.com/terser/html-minifier-terser
            }) 
        });
        this.#logger.info("Successfully generated HTML Webpack Plugin list.");
        this.#logger.debug("The HTML WEBPACK PLUGIN is %o", this.#htmlWebPackPluginList);
        this.#logger.logSeparator();
    }

    #generateEntryModule() {
        this.#logger.logTitle("Generate entry module obj.");
        this.#logger.info("Generating entry module obj.")
        // Convert list to object using reduce
        this.#entryObj = this.#entryPointParameters.reduce((obj, element) => {
            if(element.injectHead) {
                element.name = `${element.name}_head`;
            }
            obj[element.name] = element.realPath;
        return obj;
        }, {});
        this.#logger.info("Successfully generated entry module object.");
        this.#logger.debug("The entry object is \n%o.", this.#entryObj);
        this.#logger.logSeparator();
    }

    #generateLoaders() {
        if(!this.#confObj.webpack.loaders) {
            return;
        }
        this.#logger.logTitle("Generate loaders.");
        this.#logger.info("Generating loaders.")

        this.#confObj.webpack.loaders?.forEach((ele) => {
            // If this is stringReplaceLoader
            if(ele.stringReplaceLoader) {
                this.#loaders.push(...ele.stringReplaceLoader.map((loaderParam) => {
                    return {
                        test: new RegExp(loaderParam.test[0]),
                        loader: "string-replace-loader",
                        include: loaderParam.includes[0].include.map(value =>
                            path.resolve(this.#dirname, value)
                        ),
                        options: {
                            multiple: [
                                ...loaderParam.options[0]?.multiple[0]?.replace.map((el) => {
                                    return {
                                        search: el.search[0],
                                        replace: el.replace[0]
                                    }
                                })
                            ] ?? []
                        }
                    }
                }));
            }
        });
        this.#loaders.filter((ele) => ele != null);
        this.#logger.info("Successfully generated loaders");
        this.#logger.debug("The loaders are \n%o.", this.#loaders);
        this.#logger.logSeparator();
    }
}

module.exports = WebpackGenerator;