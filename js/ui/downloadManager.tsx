import { For, onMount } from "solid-js";
import { ipcRenderer as ipc, shell } from "electron";

import webviews from "./webviewUtils";
import * as remoteMenu from "./shared/remoteMenuRenderer";
import { l } from "../../localization";
import { createStore, produce } from "solid-js/store";

function getFileSizeString(bytes) {
  const prefixes = ["B", "KB", "MB", "GB", "TB", "PB"];

  let size = bytes;
  let prefixIndex = 0;

  while (size > 900) {
    // prefer "0.9 KB" to "949 bytes"
    size /= 1024;
    prefixIndex++;
  }

  return Math.round(size * 10) / 10 + " " + prefixes[prefixIndex];
}

interface DownloadItem {
  name: string;
  status: string;
  path: string;
  size: {
    total: number;
    received: number;
  };
}

interface State {
  isHidden: boolean;
  downloadItems: Record<string, DownloadItem>;
  lastDownloadCompleted: number | null;
}

const HEIGHT = 40;

const [state, setState] = createStore<State>({
  isHidden: true,
  downloadItems: {},
  lastDownloadCompleted: null,
});

const showDownloadBar = () => {
  setState({ isHidden: false });
  webviews.adjustMargin([0, 0, HEIGHT, 0]);
};

const hideDownloadBar = () => {
  webviews.adjustMargin([0, 0, HEIGHT * -1, 0]);
  setState(
    produce<State>((draft) => {
      draft.isHidden = true;
      Object.keys(draft.downloadItems).forEach((path) => {
        if (draft.downloadItems[path].status !== "progressing") {
          delete draft.downloadItems[path];
        }
      });
    })
  );
};

const updateDownloadItem = (item: DownloadItem) => {
  setState("downloadItems", { [item.path]: item });
};

const removeDownloadItem = (path: string) => {
  setState(
    produce<State>((draft) => {
      delete draft.downloadItems[path];
      if (Object.keys(draft.downloadItems).length === 0) {
        draft.isHidden = true;
      }
    })
  );
};

const openCancelDropdown = (path: string, e: MouseEvent) => {
  e.stopPropagation();
  const template = [
    [
      {
        label: l("downloadCancel"),
        click: () => {
          ipc.send("cancelDownload", path);
          removeDownloadItem(path);
        },
      },
    ],
  ];

  const targetPosition = (
    e.target as HTMLButtonElement
  ).getBoundingClientRect();

  remoteMenu.open(
    template,
    Math.round(targetPosition.left),
    Math.round(targetPosition.top - 15)
  );
};

const openFolder = (path: string, e: MouseEvent) => {
  e.stopPropagation();
  shell.showItemInFolder(path);
  removeDownloadItem(path);
};

const handleItemClicked = (path: string) => {
  if (state.downloadItems[path].status === "completed") {
    shell.openPath(path);
    setTimeout(() => {
      removeDownloadItem(path);
    }, 100);
  }
};

const handleItemDrag = (path: string, e: MouseEvent) => {
  e.preventDefault();
  ipc.invoke("startFileDrag", path);
};

const handleDownloadCompleted = () => {
  const lastDownloadCompleted = Date.now();
  setTimeout(() => {
    if (
      Date.now() - lastDownloadCompleted >= 120000 &&
      !Object.values(state.downloadItems).some(
        (i) => i.status === "progressing"
      )
    ) {
      hideDownloadBar();
    }
  }, 120 * 1000);
  setState({ lastDownloadCompleted });
};

export const DownloadBar = () => {
  onMount(() => {
    ipc.on("download-info", (_, info) => {
      // download save location hasn't been chosen yet
      if (!info.path) return;

      if (info.status === "cancelled") {
        removeDownloadItem(info.path);
        return;
      }

      if (info.status === "completed") {
        handleDownloadCompleted();
      }

      if (!state.downloadItems[info.path]) {
        showDownloadBar();
      }

      updateDownloadItem(info);
    });
  });

  return (
    <div id="download-bar" hidden={state.isHidden}>
      <div id="download-container" role="list" class="has-thin-scrollbar">
        <For each={Object.keys(state.downloadItems)}>
          {(path) => {
            return (
              <div
                draggable={true}
                role="listitem"
                onClick={[handleItemClicked, path]}
                onDragStart={[handleItemDrag, path]}
                class="download-item"
                classList={{
                  completed: state.downloadItems[path].status === "completed",
                  loading: state.downloadItems[path].status !== "completed",
                }}
              >
                <div class="download-title">
                  {state.downloadItems[path].name}
                </div>
                <div class="download-info">
                  {(state.downloadItems[path].status === "completed" &&
                    l("downloadStateCompleted")) ||
                    (state.downloadItems[path].status === "interrupted" &&
                      l("downloadStateFailed")) ||
                    getFileSizeString(state.downloadItems[path].size.total)}
                </div>
                <div class="download-info detailed">
                  {(state.downloadItems[path].status === "completed" &&
                    l("downloadStateCompleted")) ||
                    (state.downloadItems[path].status === "interrupted" &&
                      l("downloadStateFailed")) ||
                    `${getFileSizeString(
                      state.downloadItems[path].size.received
                    )} / ${getFileSizeString(
                      state.downloadItems[path].size.total
                    )}`}
                </div>
                <div
                  class="download-progress"
                  hidden={
                    state.downloadItems[path].status === "completed" ||
                    state.downloadItems[path].status === "interrupted"
                  }
                  style={{
                    transform: `scaleX(${
                      0.025 +
                      (state.downloadItems[path].size.received /
                        state.downloadItems[path].size.total) *
                        0.975
                    })`,
                  }}
                />
                <button
                  class="download-action-button i carbon:chevron-down"
                  onClick={[openCancelDropdown, path]}
                  hidden={
                    state.downloadItems[path].status === "completed" ||
                    state.downloadItems[path].status === "interrupted"
                  }
                />
                <button
                  class="download-action-button i carbon:folder"
                  onClick={[openFolder, path]}
                  hidden={
                    state.downloadItems[path].status === "interrupted" ||
                    state.downloadItems[path].status !== "completed"
                  }
                />
              </div>
            );
          }}
        </For>
      </div>
      <button
        id="download-close-button"
        class="i carbon:close"
        onClick={hideDownloadBar}
      />
    </div>
  );
};
