const {
    merge
} = require("webpack-merge");
const common = require("./webpack.common");
const {
    createLogger,
    format,
    transports
} = require('winston');
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
// const TerserPlugin = require("terser-webpack-plugin");
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin;



var logger = createLogger({
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
})

module.exports = merge(common(logger), {
    mode: "production",
    optimization: {
        usedExports: true,
        minimizer: [
            new CssMinimizerPlugin(), // Optimize the ccs
            // new TerserPlugin(), // Optimize the js
            `...`
        ],
        // splitChunks: { 
        //     chunks: "all",
        //     minSize: 30000,
        //     minChunks: 1,
        //     maxAsyncRequests: 5,
        //     maxInitialRequests: 3,
        //     cacheGroups: {
        //         vendors: {
        //             test: /[\\/]node_modules[\\/]/,
        //             priority: -10,
        //         },
        //         default: {
        //             minSize: 0,
        //             minChunks: 2,
        //             priority: -20,
        //             reuseExistingChunk: true,
        //             name: 'utils'
        //         }
        //     }
        // }
    },
    plugins: [
        new BundleAnalyzerPlugin({
            generateStatsFilename: true
        })
    ]
});

// console.dir(module.exports, { depth: null });