const path = require("path");
const esbuild = require("esbuild");
const nativeModulePlugin = require("./esbuild-native-module-plugin");
const outFile = path.resolve(__dirname, "../main.build.js");

async function buildWithEsbuild({ minify = false }) {
  const result = await esbuild.build({
    minify,
    bundle: true,
    keepNames: true,
    metafile: true,
    outfile: outFile,
    platform: "node",
    external: ["electron"],
    entryPoints: ["./main/index.js"],
    plugins: [nativeModulePlugin],
  });

  const output = result?.metafile?.outputs || {};

  Object.keys(output).forEach((fileName) => {
    // convert to kilobyte
    const fileSize = output[fileName].bytes / 1000;
    console.log(`${fileName} => ${fileSize} Kb`);
  });
}

if (module.parent) {
  module.exports = buildWithEsbuild;
} else {
  buildWithEsbuild();
}
