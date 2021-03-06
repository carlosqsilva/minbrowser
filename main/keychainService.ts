/* Uses Electron's safeStorage to encrypt a password file - encryption key gets stored in the system keychain */

import fs from "fs";
import path from "path";
import { safeStorage, app, ipcMain as ipc } from "electron";

import keytar from "keytar";
// import settings from "../js/util/settings/settingsMain";
import { localStorage } from "./localStorage";

const passwordFilePath = path.join(app.getPath("userData"), "passwordStore");

/*
file format:
{
  version: 1,
  credentials: [
    {
      domain:,
      username:,
      password:
    }
  ]
}
*/

function readSavedPasswordFile() {
  let file;
  try {
    file = fs.readFileSync(passwordFilePath);
  } catch (e: ReturnType<Error>) {
    if (e.code !== "ENOENT") {
      console.warn(e);
      throw new Error(e);
    }
  }
  if (file) {
    return JSON.parse(safeStorage.decryptString(file));
  } else {
    return {
      version: 1,
      credentials: [],
    };
  }
}

function writeSavedPasswordFile(content) {
  fs.writeFileSync(
    passwordFilePath,
    safeStorage.encryptString(JSON.stringify(content))
  );
}

function credentialStoreSetPassword(account) {
  const fileContent = readSavedPasswordFile();

  // delete duplicate credentials
  for (let i = 0; i < fileContent.credentials.length; i++) {
    if (
      fileContent.credentials[i].domain === account.domain &&
      fileContent.credentials[i].username === account.username
    ) {
      fileContent.credentials.splice(i, 1);
      i--;
    }
  }

  fileContent.credentials.push(account);
  writeSavedPasswordFile(fileContent);
}

ipc.handle("credentialStoreSetPassword", async (event, account) => {
  return credentialStoreSetPassword(account);
});

ipc.handle("credentialStoreDeletePassword", async (event, account) => {
  const fileContent = readSavedPasswordFile();

  // delete matching credentials
  for (let i = 0; i < fileContent.credentials.length; i++) {
    if (
      fileContent.credentials[i].domain === account.domain &&
      fileContent.credentials[i].username === account.username
    ) {
      fileContent.credentials.splice(i, 1);
      i--;
    }
  }

  return writeSavedPasswordFile(fileContent);
});

ipc.handle("credentialStoreGetCredentials", async () => {
  return readSavedPasswordFile().credentials;
});

/* On startup, migrate everything from keychain */

setTimeout(() => {
  if (!localStorage.getItem("v1_23_keychainMigrationComplete", false)) {
    keytar.findCredentials("Min saved password").then((results) => {
      results.forEach((result) => {
        credentialStoreSetPassword({
          domain: JSON.parse(result.account).domain,
          username: JSON.parse(result.account).username,
          password: result.password,
        });
      });
      localStorage.setItem("v1_23_keychainMigrationComplete", true);
    });
  }
}, 5000);
