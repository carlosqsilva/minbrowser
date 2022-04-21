import { app, webContents } from "electron";
import settings from "../util/settings/settingsMain";

let proxyConfig: any = {};

settings.listen("proxy", (proxy: any = {}) => {
  switch (proxy.type) {
    case 1:
      proxyConfig = {
        pacScript: "",
        proxyRules: proxy.proxyRules,
        proxyBypassRules: proxy.proxyBypassRules,
      };
      break;
    case 2:
      proxyConfig.pacScript = proxy.pacScript;
      break;
    default:
      proxyConfig = {};
  }

  webContents
    .getAllWebContents()
    .forEach((wc) => wc.session && wc.session.setProxy(proxyConfig));
});

app.on("session-created", (session) => session.setProxy(proxyConfig));
