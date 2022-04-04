const path = require('path')
const esbuild = require("esbuild")

const outFile = path.resolve(__dirname, '../main.build.js')

async function buildWithEsbuild() {
  const result = await esbuild.build({
    bundle: true,
    minify: false,
    keepNames: true,
    metafile: true,
    outfile: outFile,
    platform: "node",
    target: "node16",
    external: ["electron"],
    entryPoints: ['./main/index.js'],
  })

  const output = result?.metafile?.outputs || {};

  Object.keys(output).forEach((fileName) => {
    // convert to kilobyte
    const fileSize = output[fileName].bytes / 1000;
    console.log(`${fileName} => ${fileSize} Kb`);
  });
}

if (module.parent) {
  module.exports = buildWithEsbuild
} else {
  buildWithEsbuild()
}
