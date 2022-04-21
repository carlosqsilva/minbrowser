// @ts-check

import fs from "fs";
import path from "path";
import { ipcMain as ipc, app } from "electron";
import { getMainWindow } from "../../../main/window";

type Func = (...args: any) => void

interface Callback {
  key?: string | Func;
  cb: Func;
}

class Settings {
  public filePath: string = path.join(app.getPath("userData"), "settings.json");
  public fileWritePromise: Promise<any> | null = null;
  public list: Record<string, any> = {};
  public onChangeCallbacks: Callback[] = [];

  constructor() {
    let fileData;
    try {
      fileData = fs.readFileSync(this.filePath, "utf-8");
    } catch (e: ReturnType<Error>) {
      if (e.code !== "ENOENT") {
        console.warn(e);
      }
    }

    if (fileData) {
      this.list = JSON.parse(fileData);
    }

    ipc.on("settingChanged", (e, key, value) => {
      this.list[key] = value;
      this.writeFile();
      this.runChangeCallbacks(key);
    });
  }

  public writeFile() {
    /*
      Writing to the settings file from multiple places simultaneously causes data corruption, so to avoid that:
      * We forward data from the renderer process to the main process, and only write from there
      * In the main process, we put multiple save requests in a queue (by chaining them to a promise) so they execute individually
      * https://github.com/minbrowser/min/issues/1520
      */

    /* eslint-disable no-inner-declarations */
    const newFileWrite = () => {
      return fs.promises.writeFile(
        this.filePath,
        JSON.stringify(settings.list)
      );
    }

    const ongoingFileWrite = () => {
      return this.fileWritePromise || Promise.resolve();
    }
    /* eslint-enable no-inner-declarations */

    // eslint-disable-next-line no-return-assign
    this.fileWritePromise = ongoingFileWrite()
      .then(newFileWrite)
      .then(() => (this.fileWritePromise = null));
  }
  public runChangeCallbacks(key: string) {
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
    return settings.list[key];
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

  public set(key: string, value: any) {
    this.list[key] = value;
    this.writeFile();
    this.runChangeCallbacks(key);

    getMainWindow()?.webContents.send('settingChanged', key, value)
  }
}

const settings = new Settings();
export default settings;
