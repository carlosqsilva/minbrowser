const path = require("path");
const esbuild = require("esbuild");

const { solidPlugin } = require("./esbuild-solid-plugin");

/** @type {import('esbuild').BuildOptions} */
const defaultConfig = {
  bundle: true,
  // minify: true,
  keepNames: true,
  metafile: true,
  platform: "node",
  external: ["electron"],
  plugins: [solidPlugin()],
};

/** @type {import('esbuild').BuildOptions} */
const pageConfig = Object.assign({}, defaultConfig, { platform: "browser" });

/** @type {(res: import('esbuild').BuildResult) => void} */
function printOutput(result) {
  const output = result?.metafile?.outputs || {};

  Object.keys(output).forEach((fileName) => {
    // convert to kilobyte
    const fileSize = output[fileName].bytes / 1000;
    console.log(`${fileName} => ${fileSize} Kb`);
  });
}

async function bundleRendererFiles(entryPoint, outputFile) {
  const result = await esbuild.build({
    ...defaultConfig,
    outfile: outputFile,
    entryPoints: [entryPoint],
  });
  printOutput(result);
}

async function bundlePageFiles(entryPoint, outputFile) {
  const result = await esbuild.build({
    ...pageConfig,
    outfile: outputFile,
    entryPoints: [entryPoint],
  });
  printOutput(result);
}

function build() {
  // build browser interface
  const browserOutputFile = path.resolve(__dirname, "../dist/bundle.js");
  bundleRendererFiles("./js/index.ts", browserOutputFile);

  // build settings page
  const settingsOutputFile = path.resolve(__dirname, "../dist/settings.js");
  bundlePageFiles("./pages/settings/settings.tsx", settingsOutputFile);

  // build error page
  const errorOutputFile = path.resolve(__dirname, "../dist/error.js");
  bundlePageFiles("./pages/error/error.tsx", errorOutputFile);

  // build reader page
  const readerOutputFile = path.resolve(__dirname, "../dist/reader.js");
  bundlePageFiles("./reader/reader.tsx", readerOutputFile);
}

if (module.parent) {
  module.exports = build;
} else {
  build();
}
