const path = require("path");
const esbuild = require("esbuild");

const outfile = path.resolve(__dirname, "../dist/placesWorker.js");

async function build({ minify = false }) {
  const result = await esbuild.build({
    outfile,
    minify,
    bundle: true,
    keepNames: true,
    metafile: true,
    platform: "browser",
    external: ["electron"],
    entryPoints: ["./js/ui/places/places.worker.ts"],
  });

  const output = result?.metafile?.outputs || {};

  Object.keys(output).forEach((fileName) => {
    // convert to kilobyte
    const fileSize = output[fileName].bytes / 1000;
    console.log(`${fileName} => ${fileSize} Kb`);
  });
}

if (module.parent) {
  module.exports = build;
} else {
  build();
}
