const {merge} = require("webpack-merge");
const common = require("./webpack.common");
const {createLogger, format, transports} = require('winston');
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin

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
})

module.exports = merge(common(logger), { 
    mode: "development",
    // plugins: [
    //     new BundleAnalyzerPlugin({
    //         generateStatsFilename: true
    //     })
    // ]
});

// console.dir(module.exports, { depth: null });