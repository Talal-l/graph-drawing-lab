const path = require("path");
module.exports = {
  mode: "development",
  entry: {
    main: "./src/js/main.js",
    summary: "./src/js/summary.js",
    batchRun: "./src/js/batchRun.js",
    layoutWorker: "./src/js/layoutWorker.js",
    layoutTest: "./src/js/layoutTest.js",
  },

  output: {
    path: path.join(__dirname, "build"),
    filename: "[name].js",
  },
  devtool: "eval-source-map",
};
