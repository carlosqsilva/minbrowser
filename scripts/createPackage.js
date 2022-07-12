const builder = require("electron-builder");
const Platform = builder.Platform;
const Arch = builder.Arch;

function toPath(arch) {
  switch (arch) {
    case Arch.arm64:
      return "dist/app/mac-arm64";
    case Arch.x64:
      return "dist/app/mac";
  }
}

module.exports = function (extraOptions) {
  const options = {
    files: [
      "**/*",
      "!**/{.DS_Store,.git,.hg,.svn,CVS,RCS,SCCS,.gitignore,.gitattributes}",
      "!**/{appveyor.yml,.travis.yml,circle.yml}",
      "!**/node_modules/*.d.ts",
      "!**/*.map",
      "!**/*.md",
      "!**/._*",
      "!**/icons/source",
      "!dist/app",
      // this is copied during the build
      "!**/icons/icon.icns",
      // localization files are compiled and copied to dist
      "!localization/",
      "!scripts/",
      // These are bundled in.
      "!**/main",
      // parts of modules that aren"t needed
      "!**/node_modules/@types/",
      "!**/node_modules/pdfjs-dist/legacy",
      "!**/node_modules/pdfjs-dist/lib",
      "!**/node_modules/*/{test,__tests__,tests,powered-test,example,examples}",
    ],
    mac: {
      icon: "icons/icon.icns",
      target: "dir",
      darkModeSupport: true,
      extendInfo: {
        NSHumanReadableCopyright: null,
        CFBundleDocumentTypes: [
          {
            CFBundleTypeName: "HTML document",
            CFBundleTypeRole: "Viewer",
            LSItemContentTypes: ["public.html"],
          },
          {
            CFBundleTypeName: "XHTML document",
            CFBundleTypeRole: "Viewer",
            LSItemContentTypes: ["public.xhtml"],
          },
        ],
        NSUserActivityTypes: ["NSUserActivityTypeBrowsingWeb"], // macOS handoff support
      },
    },
    directories: {
      output: "dist/app",
      buildResources: "resources",
    },
    protocols: [
      {
        name: "HTTP link",
        schemes: ["http", "https"],
      },
      {
        name: "File",
        schemes: ["file"],
      },
    ],
    asar: false,
  };

  const target = Platform.MAC.createTarget(["dir"], extraOptions.arch);

  return builder
    .build({
      targets: target,
      config: options,
    })
    .then(() => {
      return Promise.resolve(toPath(extraOptions.arch));
    });
};
