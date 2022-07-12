import fs from "fs";
import path from "path";
import { ipcRenderer as ipc } from "electron";
import { createSignal, onMount } from "solid-js";

import { currentTab, stateUI, setEditorHidden } from "./store";
import { getConfig } from "./settings/config";

const imagePath = path.join(getConfig("user-data-path"), "newTabBackground");

export const Webviews = () => {
  let background: HTMLImageElement;
  const [hasImage, setHasImage] = createSignal(false);

  const reloadImage = () => {
    background.src = imagePath;
    background.onload = () => {
      document.body.classList.add("ntp-has-background");
      setHasImage(true);
    };
    background.onerror = () => {
      document.body.classList.remove("ntp-has-background");
      setHasImage(false);
    };
  };

  onMount(reloadImage);

  const handleImagePicker = async () => {
    const [filePath] = await ipc.invoke("showOpenDialog", {
      filters: [
        {
          name: "Image Files",
          extensions: ["jpg", "jpeg", "png", "gif", "webp"],
        },
      ],
    });

    if (!filePath) return;

    await fs.promises.copyFile(filePath, imagePath);
    reloadImage();
  };

  const handleDeleteBackground = () => {
    fs.promises.unlink(imagePath).then(reloadImage);
  };

  return (
    <div id="webviews" onClick={() => setEditorHidden()}>
      <div id="leftArrowContainer" class="arrow-indicator">
        <i id="leftArrow" class="i carbon:chevron-left" />
      </div>
      <div id="rightArrowContainer" class="arrow-indicator">
        <i id="rightArrow" class="i carbon:chevron-right" />
      </div>
      <img
        id="webview-placeholder"
        hidden={stateUI.placeholderHidden}
        src={currentTab()?.previewImage}
      />
      <div id="ntp-content">
        <img id="ntp-background" hidden={!hasImage()} ref={background} />
        <div id="ntp-background-controls">
          <button
            id="ntp-image-remove"
            hidden={!hasImage()}
            onClick={handleDeleteBackground}
          >
            <i class="i carbon:delete" />
          </button>
          <button id="ntp-image-picker" onClick={handleImagePicker}>
            <i class="i carbon:camera" />
          </button>
        </div>
      </div>
    </div>
  );
};
