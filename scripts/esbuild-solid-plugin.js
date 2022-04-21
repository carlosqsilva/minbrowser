const { parse } = require("path");
const { readFile } = require("fs/promises");
const { transformAsync } = require("@babel/core");
const solid = require("babel-preset-solid");
const ts = require("@babel/preset-typescript");

const defaultOptions = {
  hydratable: true,
  generate: "dom",
};

const regexMap = {
  "solid-js": /(?<=solid-js\/).*$/gm,
  "solid-js/web": /(?<=solid-js\/web\/).*$/gm,
  "solid-js/store": /(?<=solid-js\/store\/).*$/gm,
};

/** @type {() => import('esbuild').Plugin} */
function solidPlugin(options) {
  const pluginOptions = Object.assign({}, defaultOptions, options);

  return {
    name: "esbuild:solid",

    setup(build) {
      build.onResolve({ filter: /solid-js/ }, ({ path, resolveDir }) => {

        let newPath = require.resolve(path, {
          paths: [resolveDir],
        });

        if (path === "solid-js/web") {
          newPath = newPath.replace(regexMap[path], "dist/web.js");
        } else if (path === "solid-js/store") {
          newPath = newPath.replace(regexMap[path], "dist/store.js");
        } else {
          newPath = newPath.replace(regexMap[path], "dist/solid.js");
        }

        return {
          path: newPath,
        };
      });

      build.onLoad({ filter: /\.tsx$/ }, async (args) => {
        const source = await readFile(args.path, { encoding: "utf-8" });

        const { name, ext } = parse(args.path);
        const filename = name + ext;

        const { code } = await transformAsync(source, {
          presets: [[solid, pluginOptions], ts],
          filename,
          sourceMaps: "inline",
        });

        return { contents: code, loader: "js" };
      });
    },
  };
}

module.exports = { solidPlugin };
