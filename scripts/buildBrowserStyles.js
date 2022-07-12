const esbuild = require("esbuild")
const path = require("path");
const fs = require("fs");

const entryFile = "./css/index.css";
const outFile = path.resolve(__dirname, "../dist/bundle.css");

const buildBrowserStyles = async () => {
  const result = await esbuild.build({
    bundle: true,
    minify: true,
    metafile: true,
    outfile: outFile,
    target: "esnext",
    entryPoints: [entryFile],
    loader: {
      '.woff2': 'dataurl',
    },
  });

  const output = result?.metafile?.outputs || {};

  Object.keys(output).forEach((fileName) => {
    // convert to kilobyte
    const fileSize = output[fileName].bytes / 1000;
    console.log(`${fileName} => ${fileSize} Kb`);
  });
};

if (module.parent) {
  module.exports = buildBrowserStyles;
} else {
  buildBrowserStyles();
}
