const path = require("path");
module.exports = {
    mode: "production",
    entry: {
        main: "./src/js/main.js",
        batchRun: "./src/js/batchRun.js",
        layoutWorker: "./src/js/layoutWorker.js"
    },

    output: {
        path: path.join(__dirname, "build"),
        filename: "[name].js"
    },
    devtool: "eval-source-map"
};
