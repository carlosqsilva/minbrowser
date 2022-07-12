import fs from "fs";
import path from "path";
import { app, BrowserWindow } from "electron";
import { ipcMain as ipc } from "electron";

type Listener = (value: any) => void;

class LocalStorage {
  timeout: NodeJS.Timeout = null;
  basePath: string | null = null;
  storage: Record<string, any> = null;

  changeCallback: { key?: string | Listener; callback: Listener }[] = [];

  onReadyCallback: Listener[] = [];
  isReady = false;

  constructor(basePath: string) {
    this.basePath = basePath;
    this.readStorage().then((data) => {
      this.storage = data;
      this.isReady = true;

      if (this.onReadyCallback.length > 0) {
        this.onReadyCallback.forEach((fn) => fn(this));
        this.onReadyCallback = [];
      }
    });

    ipc.on("settingChanged", (e, key, value) => {
      this.setItem(key, value);
    });
  }

  ready() {
    return new Promise((resolve) => {
      this.onReady(resolve);
    });
  }

  onReady(fn: (storage: LocalStorage) => void) {
    if (this.isReady) {
      fn(this);
    } else {
      this.onReadyCallback.push(fn);
    }
  }

  readStorage(): Promise<Record<string, any>> {
    return new Promise((resolve) => {
      fs.readFile(this.basePath, "utf-8", (err, content) => {
        if (err && err.code === "ENOENT") {
          resolve({});
        }

        try {
          const data = JSON.parse(content);
          resolve(data);
        } catch (error) {
          console.error(
            `[localstorage] Failed to parse item from LocalStorage: ${error}`
          );
          resolve({});
        }
      });
    });
  }

  setItem<T>(key: string, obj?: T) {
    clearTimeout(this.timeout);
    this.storage = this.storage ?? {};
    this.storage[key] = obj;
    this.timeout = setTimeout(this.flush.bind(this), 100);

    this.runChangeCallbacks(key);
    const [window] = BrowserWindow.getAllWindows();
    window?.webContents.send("settingChanged", key, obj);
  }

  getItem<T>(key: string, defaultObj: T): T {
    if (key in this.storage) {
      return this.storage[key] ?? defaultObj;
    }

    this.setItem(key, defaultObj);
    return defaultObj;
  }

  listen(key: string | Listener, callback?: Listener) {
    if (typeof key === "string" && callback) {
      callback(this.getItem(key, null));
      this.changeCallback.push({ key, callback });
    } else if (typeof key === "function") {
      // global listener
      this.changeCallback.push({ callback: key });
    }
  }

  runChangeCallbacks(key: string) {
    this.changeCallback.forEach((listener) => {
      if (listener.key === key) {
        listener.callback(this.storage[listener.key]);
      }
    });
  }

  flush() {
    if (!Object.keys(this.storage).length) {
      return;
    }

    try {
      fs.writeFileSync(this.basePath, JSON.stringify(this.storage));
    } catch (error) {
      console.error(`[localstorage] Failed to save to LocalStorage: ${error}`);
    }
  }
}

export const localStorage = new LocalStorage(
  path.join(app.getPath("userData"), "storage.json")
);
