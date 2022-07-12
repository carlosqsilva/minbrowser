const buildMain = require("./buildMain");
const buildBrowser = require("./buildBrowser");
const buildWorker = require("./buildWorker");
const buildPreload = require("./buildPreload");
const buildBrowserStyles = require("./buildBrowserStyles");

const opt = { minify: true };

buildMain(opt);
buildBrowser(opt);
buildWorker(opt);
buildPreload(opt);
buildBrowserStyles(opt);
