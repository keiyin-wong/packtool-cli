const fs = require('fs');
const path = require('path');
const WebpackGenerator = require('../Generator/WebpackGenerator');

const {
	ProvidePlugin
} = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const {
	CleanWebpackPlugin
} = require("clean-webpack-plugin");
const HtmlWebpackInjector = require('html-webpack-injector');
const TimeLoggerPlugin = require('../plugins/TimeLoggerPlugin');


// // Get the xml configuration
// var parser = new xml2js.Parser();
// const xmlString = fs.readFileSync(__dirname + '/webpack-config/conf.xml');
// var confObj = null;
// parser.parseString(xmlString, function (err, result) {
//     confObj = result;
// });

// console.dir(confObj, { depth: null });


// Export the function for common object 
module.exports = function(logger, dirname, confObj) {
    if(!logger) {
        throw new Error("Invaid Logger");
    }

    // console.log("The jquery modules is", require.resolve("jquery"), require.resolve(path.join(dirname, 'node_modules/jquery')));
   
    let webpackGenerator = new WebpackGenerator(confObj, dirname, logger);

    return {
        entry: webpackGenerator.entryObj,
        output: {
            filename: `${confObj.webpack.entry[0].outputFolder[0]}[name].bundle.js`,
            path: path.resolve(dirname, confObj.webpack.outputFolder?.[0] ?? "dist/")
        },
        plugins: [
            ...confObj.webpack.copyPlugins?.[0].copyPlugin.map((ele) => {
                return new CopyPlugin({
                    patterns:[{
                        from: ele.from[0],
                        to: ele.to[0]
                    }]
                });
            }) ?? [],
            // new ProvidePlugin({
            //     $: "jquery",
            //     jQuery: "jquery",
            //     "window.jQuery": "jquery",
            //     fn: "jquery",
            // }), // In order to use the jquery $ without import it, for example let bootstrap.js use it.
            new MiniCssExtractPlugin({
                filename: `${confObj.webpack.entry[0].cssOutputFolder[0]}[name].bundle.css`
            }), // Instead of using style loader inject, we extract css to separate file.
            // new HtmlWebpackInjector(),
            new TimeLoggerPlugin(),
            new CleanWebpackPlugin({
                cleanStaleWebpackAssets: false
            }),
        ].concat(webpackGenerator.htmlWebPackPluginList),
        module: {
            rules: [
                {
                    // test: require.resolve('jquery'),
                    test: require.resolve("jquery"),
                    use: [{
                        loader: 'expose-loader',
                        options: {
                            exposes: ["$", "jQuery"]
                        }
                    }] // Register the jquery to windows global object, so that we can use it in inline scripts
                },
                {
                    test: /\.(js|jsx)$/,
                    loader: "babel-loader",
                    options: {
                        // plugins: [
                        //     "@babel/plugin-syntax-jsx",
                        //     path.resolve(__dirname, "../plugins/jquery_jsx_transform.js"),
                        // ],
                        presets: [
                            ["@babel/preset-env", {modules: false}] // Dont convert module syntax to commonjs. If you set the modules to "commonsjs", you will lose the tree shaking.
                        ],
                    }
                },
                {
                    test: /\.css$/,
                    use: [MiniCssExtractPlugin.loader, "css-loader"]
                }, // Use class loader to handle import css file
                {
                    test: /\.scss$/,
                    use: [MiniCssExtractPlugin.loader, "css-loader", "sass-loader"]
                }, // Use class loader to handle import css file
                {
                    test: new RegExp(confObj.webpack.assets[0].pattern[0]),
                    type: "asset/resource",
                    generator: {
                        filename: `${confObj.webpack.assets[0].outputFolder[0]}[name][ext]`
                    }
                },
                {
                    test: /\.jsp$/,
                    use: [{
                        loader: "html-loader",
                        options: {
                            minimize: false // Minimize false because this is jsp, not html, unexpected behaviour if minimize is true
                        }
                    }]
                },
                ...webpackGenerator.loaders
            ]
        }
    }
}