// @ts-check

const { ipcRenderer } = require("electron");

const { tasks } = require("../tabState");
const settings = require("../util/settings/settings.js");
const webviews = require("../webviews.js");
const keybindings = require("../keybindings.js");
// const statistics = require("../../js/statistics.js");

const Keychain = require("./keychain.js");

const { l } = require("../../localization");

const PasswordManagers = {
  // List of supported password managers. Each password manager is expected to
  // have getSuggestions(domain) method that returns a Promise with credentials
  // suggestions matching given domain name.
  manager: new Keychain(),
  // Returns an active password manager, which is the one that is selected in app's
  // settings.
  getActivePasswordManager: function () {
    // const managerSetting = settings.get("passwordManager");
    return PasswordManagers.manager
  },
  getConfiguredPasswordManager: async function () {
    return PasswordManagers.manager
  },
  // Shows a prompt dialog for password store's master password.
  promptForMasterPassword: async function (manager) {
    return new Promise((resolve, reject) => {
      const { password } = ipcRenderer.sendSync("prompt", {
        text: l("passwordManagerUnlock").replace("%p", manager.name),
        values: [
          { placeholder: l("password"), id: "password", type: "password" },
        ],
        ok: l("dialogConfirmButton"),
        cancel: l("dialogSkipButton"),
        height: 160,
      });
      if (password === null || password === "") {
        reject(new Error("No password provided"));
      } else {
        resolve(password);
      }
    });
  },
  // unlock: async function (manager) {
  //   let success = false;
  //   while (!success) {
  //     let password;
  //     try {
  //       password = await PasswordManagers.promptForMasterPassword(manager);
  //     } catch (e) {
  //       // dialog was canceled
  //       break;
  //     }
  //     try {
  //       success = await manager.unlockStore(password);
  //     } catch (e) {
  //       // incorrect password, prompt again
  //     }
  //   }
  //   return success;
  // },
  // Binds IPC events.
  initialize: function () {
    // Called when page preload script detects a form with username and password.
    webviews.bindIPC("password-autofill", function (tab, args, frameId) {
      // We expect hostname of the source page/frame as a parameter.
      if (args.length === 0) {
        return;
      }
      const hostname = args[0];

      PasswordManagers.getConfiguredPasswordManager().then(async (manager) => {

        var domain = hostname;
        if (domain.startsWith("www.")) {
          domain = domain.slice(4);
        }

        manager
          .getSuggestions(domain)
          .then((credentials) => {
            if (credentials != null) {
              webviews.callAsync(tab, "getURL", function (err, topLevelURL) {
                if (err) {
                  console.warn(err);
                  return;
                }
                var topLevelDomain = new URL(topLevelURL).hostname;
                if (topLevelDomain.startsWith("www.")) {
                  topLevelDomain = topLevelDomain.slice(4);
                }
                if (domain !== topLevelDomain) {
                  console.warn("autofill isn't supported for 3rd-party frames");
                  return;
                }
                webviews.callAsync(tab, "sendToFrame", [
                  frameId,
                  "password-autofill-match",
                  {
                    credentials,
                    hostname,
                  },
                ]);
              });
            }
          })
          .catch((e) => {
            console.error("Failed to get password suggestions: " + e.message);
          });
      });
    });

    webviews.bindIPC("password-autofill-check", function (tab, args, frameId) {
      webviews.callAsync(tab, "sendToFrame", [
        frameId,
        "password-autofill-enabled",
      ]);
    });

    keybindings.defineShortcut("fillPassword", function () {
      webviews.callAsync(tasks.tabs.getSelected(), "send", [
        "password-autofill-shortcut",
      ]);
    });

    // statistics.registerGetter("passwordManager", function () {
    //   return PasswordManagers.manager.name;
    // });
  },
};

module.exports = PasswordManagers;
