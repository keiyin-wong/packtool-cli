#! /usr/bin/env node

const { program } = require('commander');
const webpack = require("webpack");
const xml2js = require("xml2js");
const fs = require("fs");
const path = require('path');
const {createLogger, transports, format} = require("winston");
const {
    merge
} = require("webpack-merge");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const common = require("../webpack/webpack.common");
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin;


// Define command

program
    .option('-v, --version', 'get project version')
    .option('-d, --dev', 'run project in dev mode')
    .option('-b, --build', 'run project in build mode')
    .option('-w, --watch', 'run project in watch mode')
    .option('-c, --config <config>', 'config file path');

program.parse(process.argv);
const options = program.opts();


// Global variable
let configPath = "conf.xml";
let watch = false;

// Get the configuration file
if(options.config) {
    configPath = options.config;
}
if(options.watch) {
    watch = true;
}

let parser = new xml2js.Parser();
let filePath = path.join(process.cwd(), configPath);
const xmlString = fs.readFileSync(filePath);
let confObj = null;
parser.parseString(xmlString, function (err, result) {
    confObj = result;
});
// console.dir(confObj, { depth: null });

if(options.build) {
    // Create logger with info level
    let logger = createLogger({
        transports: [
            new transports.Console({
                level: "info",
                format: format.combine(
                    format.timestamp({
                        format: "MMM-DD-YYYY HH:mm:ss"
                    }),
                    format.colorize(),
                    format.splat(),
                    format.printf((info) => {
                        return `${info.level}: ${info.timestamp}: ${info.message}`
                    })
                )
            })
        ]
    });

    webpack(merge(common(logger, process.cwd(), confObj), {
        mode: "production",
        optimization: {
            usedExports: true,
            minimizer: [
                new CssMinimizerPlugin(), // Optimize the ccs
                // new TerserPlugin(), // Optimize the js
                `...`
            ],
        },
        watch: watch,
        // plugins: [
        //     new BundleAnalyzerPlugin({
        //         generateStatsFilename: true
        //     })
        // ]
    }), (err, stats) => {
        if (err) {
            console.error(err);
        } else {
            console.log(stats.toString());
        }
    });
} else if (options.dev) {
    // Create logger with debug level
    var logger = createLogger({
        transports: [
            new transports.Console({
                level: "debug",
                format: format.combine(
                    format.timestamp({format: "MMM-DD-YYYY HH:mm:ss"}),
                    format.colorize(),
                    format.splat(),
                    format.printf((info) => {
                        return `${info.level}: ${info.timestamp}: ${info.message}`
                    })
                )
            })
        ]
    });

    webpack(merge(common(logger, process.cwd(), confObj), {
        mode: "development",
        watch: watch,
    }), (err, stats) => {
        if (err) {
            console.error(err);
        } else {
            console.log(stats.toString());
        }
    });
}
else {
    throw new Error("Please specify the build mode");
}