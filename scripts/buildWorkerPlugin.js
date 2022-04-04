/* eslint-env node */
const esbuild = require("esbuild");
const findCacheDir = require("find-cache-dir");
const fs = require("fs");
const path = require("path");

const wrapperWorkerCode = (code) => `import inlineWorker from '__inline-worker'
export default function Worker() {
  return inlineWorker(${JSON.stringify(code)});
}
`

function inlineWorkerPlugin(extraConfig) {
  return {
    name: "esbuild-plugin-inline-worker",

    setup(build) {
      build.onLoad(
        { filter: /\.worker\.(js|jsx|ts|tsx)$/ },
        async ({ path: workerPath }) => {

          const workerCode = await buildWorker(workerPath, extraConfig);

          return {
            contents: wrapperWorkerCode(workerCode),
            loader: "js",
          };
        }
      );

      build.onResolve({ filter: /^__inline-worker$/ }, ({ path }) => {
        return { path, namespace: "inline-worker" };
      });
      build.onLoad({ filter: /.*/, namespace: "inline-worker" }, () => {
        return { contents: inlineWorkerFunctionCode, loader: "js" };
      });
    },
  };
}

const inlineWorkerFunctionCode = `
export default function inlineWorker(scriptText) {
  let blob = new Blob([scriptText], {type: 'text/javascript'});
  let url = URL.createObjectURL(blob);
  let worker = new Worker(url);
  URL.revokeObjectURL(url);
  return worker;
}
`;

let cacheDir = findCacheDir({
  name: "esbuild-plugin-inline-worker",
  create: true,
});

async function buildWorker(workerPath, extraConfig) {
  let scriptNameParts = path.basename(workerPath).split(".");
  scriptNameParts.pop();
  scriptNameParts.push("js");
  let scriptName = scriptNameParts.join(".");
  let bundlePath = path.resolve(cacheDir, scriptName);

  if (extraConfig) {
    delete extraConfig.entryPoints;
    delete extraConfig.outfile;
    delete extraConfig.outdir;
  }

  await esbuild.build({
    entryPoints: [workerPath],
    bundle: true,
    minify: true,
    outfile: bundlePath,
    target: "es2017",
    format: "esm",
    ...extraConfig,
  });

  return fs.promises.readFile(bundlePath, { encoding: "utf-8" });
}

module.exports = {
  inlineWorkerPlugin
}