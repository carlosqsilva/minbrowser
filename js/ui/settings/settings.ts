import fs from "fs";
import path from "path";
import { ipcRenderer as ipc } from "electron";
import { getConfig } from "./config";

type Func = (...args: any) => void;

interface Callback {
  key?: string | Func;
  cb: Func;
}

export interface ISettings {
  runChangeCallbacks: (key?: string) => void
  get: (key: string, cb?: any) => void
  listen: (key: string | Func, cb?: Func) => void
  set: (key: string, value: any) => void
}

class Settings implements ISettings {
  public list: Record<string, any> = {};
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

  public get(key: string) {
    return this.list[key];
  }

  public listen(key: string | Func, cb?: Func) {
    if (key && cb) {
      cb(this.get(key as string));
      this.onChangeCallbacks.push({ key, cb });
    } else if (key) {
      // global listener
      this.onChangeCallbacks.push({ cb: key as Func });
    }
  }

  public set(key, value) {
    this.list[key] = value;
    ipc.send("settingChanged", key, value);
    this.runChangeCallbacks(key);
  }

  constructor() {
    let fileData;

    try {
      fileData = fs.readFileSync(
        path.join(getConfig("user-data-path"), "settings.json"),
        "utf-8"
      );
    } catch (e: ReturnType<Error>) {
      if (e.code !== "ENOENT") {
        console.warn(e);
      }
    }
    if (fileData) {
      this.list = JSON.parse(fileData);
    }

    this.runChangeCallbacks();

    ipc.on("settingChanged", (e, key, value) => {
      this.list[key] = value;
      this.runChangeCallbacks(key);
    });
  }
}

const setttings = new Settings();
export default setttings;
