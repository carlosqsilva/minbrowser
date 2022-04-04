const esbuild = require("esbuild")
const path = require('path')

const outFile = path.resolve(__dirname, '../dist/preload.js')

async function buildPreload() {
  const result = await esbuild.build({
    bundle: true,
    minify: false,
    keepNames: true,
    metafile: true,
    target: "esnext",
    platform: "browser",
    format: "cjs",
    external: ["electron"],
    entryPoints: ['./js/preload/index.js'],
    outfile: outFile
  })

  const output = result?.metafile?.outputs || {};

  Object.keys(output).forEach((fileName) => {
    // convert to kilobyte
    const fileSize = output[fileName].bytes / 1000;
    console.log(`${fileName} => ${fileSize} Kb`);
  });
}

if (module.parent) {
  module.exports = buildPreload
} else {
  buildPreload()
}
