const chokidar = require("chokidar");
const path = require("path");

const buildMain = require("./buildMain");
const buildBrowser = require("./buildBrowser");
const buildWorker = require("./buildWorker");
const buildPreload = require("./buildPreload");
const buildBrowserStyles = require("./buildBrowserStyles");

const mainDir = path.resolve(__dirname, "../main");
chokidar.watch(mainDir).on("change", () => {
  console.log("rebuilding main");
  buildMain();
});

const preloadDir = path.resolve(__dirname, "../js/preload");
chokidar.watch(preloadDir).on("change", () => {
  console.log("rebuilding preload script");
  buildPreload();
});

const worker = [path.resolve(__dirname, "../js/places/places.worker.js")];
chokidar.watch(worker).on("change", () => {
  console.log("rebuilding workers");
  buildWorker();
});

const jsDir = path.resolve(__dirname, "../js");
chokidar.watch(jsDir, { ignored: preloadDir }).on("change", () => {
  console.log("rebuilding browser");
  buildBrowser();
});

const browserStylesDir = path.resolve(__dirname, "../css");
chokidar.watch(browserStylesDir).on("change", () => {
  console.log("rebuilding browser styles");
  buildBrowserStyles();
});
