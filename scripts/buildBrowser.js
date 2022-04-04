const path = require('path')

const esbuild = require("esbuild")
const {inlineWorkerPlugin} = require("./buildWorkerPlugin")

const outFile = path.resolve(__dirname, '../dist/bundle.js')

async function buildWithEsbuild() {
  const result = await esbuild.build({
    bundle: true,
    // minify: true,
    keepNames: true,
    metafile: true,
    outfile: outFile,
    platform: "node",
    external: ["electron"],
    entryPoints: ['./js/index.ts'],
    plugins: [inlineWorkerPlugin({
      external: ["electron"],
    })],
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
