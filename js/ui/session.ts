import fs from "fs";
import path from "path";

import { addTab } from "./browserUI";
import { getConfig } from "./settings/config";
import { createNewTab, getStringifyableState, Tab } from "./store";

interface SessionState {
  tabs: Tab[];
  selected: string;
}

interface SessionData {
  version: number;
  saveTime: number;
  state: SessionState;
}

const sessionFilePath = path.join(
  getConfig("user-data-path"),
  "sessionRestore.json"
);

let previousState = null;

function save(forceSave?: boolean, sync?: boolean) {
  const state = getStringifyableState();
  const stateString = JSON.stringify(state);
  const data: SessionData = {
    state,
    version: 3,
    saveTime: Date.now(),
  };

  if (forceSave || previousState !== stateString) {
    if (sync) {
      fs.writeFileSync(sessionFilePath, JSON.stringify(data));
    } else {
      fs.writeFile(sessionFilePath, JSON.stringify(data), (err) => {
        if (err) console.log(err);
      });
    }

    previousState = stateString;
  }
}

setInterval(save, 120000);
window.onbeforeunload = () => {
  save(true, true);
};

export const startNewSession = () => {
  addTab(createNewTab({ selected: true }), {
    enterEditMode: true,
  });
};

// export function restoreSession() {
//   let savedStateString: string;

//   try {
//     savedStateString = fs.readFileSync(sessionFilePath, "utf-8");
//   } catch (e) {
//     console.warn("failed to read session restore data", e);
//   }

//   try {
//     // first run send to DuckDuckGo
//     if (!savedStateString) {
//       browserUI.addTab(
//         createNewTab({ url: "https://duckduckgo.com/", selected: true }),
//         {
//           enterEditMode: true,
//         }
//       );

//       return;
//     }

//     const data = JSON.parse(savedStateString) as SessionData;
//     // the data isn't restorable
//     if (
//       (data.version && data.version !== 3) ||
//       (data.state && data.state.tabs.length === 0)
//     ) {
//       console.log("Failed to restore session");
//       browserUI.addTab(createNewTab({ selected: true }), {
//         enterEditMode: true,
//       });

//       return;
//     }

//     data.state.tabs.forEach((tab) => {
//       createNewTab(tab);
//     });

//     setImmediate(() => {
//       const hasId = data.state.tabs.some((t) => t.id === data.state.selected);
//       selectTab(hasId ? data.state.selected : data.state.tabs[0].id);
//     });
//   } catch (e) {
//     console.error("restoring session failed: ", e);

//     removeAllTabs();

//     const backupSavePath = path.join(
//       getConfig("user-data-path"),
//       "sessionRestoreBackup-" + Date.now() + ".json"
//     );

//     const errorTab = createNewTab({
//       url:
//         "file://" +
//         __dirname +
//         "/pages/sessionRestoreError/index.html?backupLoc=" +
//         encodeURIComponent(backupSavePath),
//     });

//     browserUI.addTab(errorTab);
//     browserUI.switchToTab(errorTab.id);
//   }
// }

export const getSavedSession = (): SessionState | null => {
  let savedSessionJson: string;

  try {
    savedSessionJson = fs.readFileSync(sessionFilePath, "utf-8");
  } catch (e) {
    console.warn("failed to read session restore data", e);
  }

  if (!savedSessionJson) return null;

  const data = JSON.parse(savedSessionJson) as SessionData;

  if (
    data?.version !== 3 ||
    data?.state?.tabs?.length === 0 ||
    data?.state?.tabs?.every((t) => !t.url)
  ) {
    // nothing to restore
    return null;
  }

  return data.state;
};
