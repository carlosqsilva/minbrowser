import { app } from "electron"

let isDevelopmentMode = false;

export function isDevelopment() {
  return isDevelopmentMode
}

process.argv.forEach((arg) => {
  switch (arg) {
    case "-v":
    case "--version":
      // console.log("Min: " + app.getVersion());
      // console.log("Chromium: " + process.versions.chrome);
      break;
    case "--development-mode":
      isDevelopmentMode = true;
      app.setPath("userData", app.getPath("userData") + "-development");
      break;
    default:
      break;
  }
});
