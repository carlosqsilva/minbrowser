import type { ISettings } from "./settings";
type Func = (...args: any) => void;

interface Callback {
  key?: string | Func;
  cb: Func;
}

class Settings implements ISettings {
  public loaded = false;
  public list = {};
  public onLoadCallbacks: Callback[] = [];
  public onChangeCallbacks: Callback[] = [];

  public runChangeCallbacks(key?: string) {
    this.onChangeCallbacks.forEach((listener) => {
      if (!key || !listener.key || listener.key === key) {
        if (listener.key) {
          listener.cb(this.list[listener.key as string]);
        } else {
          listener.cb(key);
        }
      }
    });
  }

  public get(key, cb) {
    // get the setting from the cache if possible
    if (this.loaded) {
      cb(this.list[key]);

      // if the settings haven't loaded, wait until they have
    } else {
      this.onLoadCallbacks.push({
        key: key,
        cb: cb,
      });
    }
  }

  public listen(key, cb) {
    if (key && cb) {
      this.get(key, cb);
      this.onChangeCallbacks.push({ key, cb });
    } else if (key) {
      // global listener
      this.onChangeCallbacks.push({ cb: key });
    }
  }

  public set(key, value) {
    this.list[key] = value;
    postMessage({ message: "setSetting", key, value });
    this.runChangeCallbacks(key);
  }

  public load() {
    postMessage({ message: "getSettingsData" });
  }

  public onLoad(cb) {
    if (this.loaded) {
      cb();
    } else {
      this.onLoadCallbacks.push({
        key: "",
        cb: cb,
      });
    }
  }
}

const settings = new Settings();

window.addEventListener("message", (e) => {
  console.log("message", e)
  
  if (e.data.message && e.data.message === "receiveSettingsData") {
    settings.list = e.data.settings;

    if (!settings.loaded) {
      settings.onLoadCallbacks.forEach((item) => {
        item.cb(settings.list[item.key as string]);
      });
      settings.onLoadCallbacks = [];
    }

    settings.loaded = true;
    settings.runChangeCallbacks();
  }
});

settings.load()

export default settings;
