import webviews from "../webviewUtils";
import settings from "../settings/settings";
const textColorNN = require("../../../ext/textColor/textColor.js");
import { currentTab, getTab, tabEvent, updateTab } from "../store";

const colorExtractorImage = document.createElement("img");
const colorExtractorCanvas = document.createElement("canvas");
const colorExtractorContext = colorExtractorCanvas.getContext(
  "2d"
) as CanvasRenderingContext2D;

const defaultColors = {
  private: ["rgb(58, 44, 99)", "white"],
  lightMode: ["rgb(255, 255, 255)", "black"],
  darkMode: ["rgb(40, 44, 52)", "white"],
};

function getHours() {
  const date = new Date();
  return date.getHours() + date.getMinutes() / 60;
}

let hours = getHours();

// we cache the hours so we don't have to query every time we change the color
setInterval(() => {
  hours = getHours();
}, 5 * 60 * 1000);

function getColorFromImage(): number[] {
  const w = colorExtractorImage.width;
  const h = colorExtractorImage.height;
  colorExtractorCanvas.width = w;
  colorExtractorCanvas.height = h;

  const offset = Math.max(1, Math.round(0.00032 * w * h));

  colorExtractorContext.drawImage(colorExtractorImage, 0, 0, w, h);

  const data = colorExtractorContext.getImageData(0, 0, w, h).data;

  const pixels = {};

  let d, add, sum;

  for (let i = 0; i < data.length; i += 4 * offset) {
    d =
      Math.round(data[i] / 5) * 5 +
      "," +
      Math.round(data[i + 1] / 5) * 5 +
      "," +
      Math.round(data[i + 2] / 5) * 5;

    add = 1;
    sum = data[i] + data[i + 1] + data[i + 2];

    // very dark or light pixels shouldn't be counted as heavily
    if (sum < 310) {
      add = 0.35;
    }

    if (sum < 50) {
      add = 0.01;
    }

    if (data[i] > 210 || data[i + 1] > 210 || data[i + 2] > 210) {
      add = 0.5 - 0.0001 * sum;
    }

    if (pixels[d]) {
      pixels[d] = pixels[d] + add;
    } else {
      pixels[d] = add;
    }
  }

  // find the largest pixel set
  let largestPixelSet: string | null = null;
  let ct = 0;

  for (const k in pixels) {
    if (k === "255,255,255" || k === "0,0,0") {
      pixels[k] *= 0.05;
    }
    if (pixels[k] > ct) {
      largestPixelSet = k;
      ct = pixels[k];
    }
  }

  const res: any[] = largestPixelSet?.split(",") || [];

  for (let i = 0; i < res.length; i++) {
    res[i] = parseInt(res[i]);
  }

  return res;
}

function getColorFromString(str: string) {
  colorExtractorContext.clearRect(0, 0, 1, 1);
  colorExtractorContext.fillStyle = str;
  colorExtractorContext.fillRect(0, 0, 1, 1);
  const rgb = Array.from(
    colorExtractorContext.getImageData(0, 0, 1, 1).data
  ).slice(0, 3);

  return rgb;
}

function getRGBString(c) {
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function getTextColor(bgColor: number[]) {
  const obj = {
    r: bgColor[0] / 255,
    g: bgColor[1] / 255,
    b: bgColor[2] / 255,
  };
  const output = textColorNN(obj);
  if (output.black > 0.5) {
    return "black";
  }
  return "white";
}

function isLowContrast(color) {
  // is this a color that won't change very much when lightened or darkened?
  // TODO is lowContrast the best name for this?
  return color.filter((i) => i > 235 || i < 15).length === 3;
}

function adjustColorForTheme(color) {
  // dim the colors late at night or early in the morning if automatic dark mode is enabled
  const darkMode = settings.get("darkMode");
  const isAuto = darkMode === undefined || darkMode === true || darkMode >= 0;

  let colorChange = 1;
  if (isAuto) {
    if (hours > 20) {
      colorChange = 1.01 / (1 + 0.9 * Math.pow(Math.E, 1.5 * (hours - 22.75)));
    } else if (hours < 6.5) {
      colorChange = 1.04 / (1 + 0.9 * Math.pow(Math.E, -2 * (hours - 5)));
    }
  }

  if (window.isDarkMode) {
    colorChange = Math.min(colorChange, 0.6);
  }

  return [
    Math.round(color[0] * colorChange),
    Math.round(color[1] * colorChange),
    Math.round(color[2] * colorChange),
  ];
}

// https://stackoverflow.com/a/596243
function getLuminance(c) {
  return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
}

function setColor(bg: string, fg: string, isLowContrast?: boolean) {
  const backgroundElements = document.getElementsByClassName(
    "theme-background-color"
  ) as HTMLCollectionOf<HTMLDivElement>;

  const textElements = document.getElementsByClassName(
    "theme-text-color"
  ) as HTMLCollectionOf<HTMLSpanElement>;

  for (let i = 0; i < backgroundElements.length; i++) {
    backgroundElements[i].style.backgroundColor = bg;
  }

  for (let i = 0; i < textElements.length; i++) {
    textElements[i].style.color = fg;
  }

  if (fg === "white") {
    document.body.classList.add("dark-theme");
  } else {
    document.body.classList.remove("dark-theme");
  }
  if (isLowContrast) {
    document.body.classList.add("theme-background-low-contrast");
  } else {
    document.body.classList.remove("theme-background-low-contrast");
  }
}

class TabColor {
  public useSiteTheme = true;

  constructor() {
    webviews.bindEvent("page-favicon-updated", (tabId, favicons) => {
      this.updateFromImage(favicons, tabId, () => {
        if (tabId === currentTab()?.id) {
          this.updateColors();
        }
      });
    });
    
    webviews.bindEvent("did-change-theme-color", (tabId, color) => {
      this.updateFromThemeColor(color, tabId);
      if (tabId === currentTab()?.id) {
        this.updateColors();
      }
    });
    
    /*
    Reset the icon color when the page changes, so that if the new page has no icon it won't inherit the old one
    But don't actually render anything here because the new icon won't have been received yet
    and we want to go from old color > new color, rather than old color > default > new color
    */
   webviews.bindEvent(
      "did-start-navigation",
      (tabId, url, isInPlace, isMainFrame, frameProcessId, frameRoutingId) => {
        if (isMainFrame) {
          updateTab(tabId, {
            backgroundColor: null,
            favicon: null,
          });
        }
      }
      );
      
      /*
      Always rerender once the page has finished loading
      this is needed to go back to default colors in case this page doesn't specify one
      */
     webviews.bindEvent("did-finish-load", (tabId) => {
      this.updateColors();
    });
    
    // theme changes can affect the tab colors
    window.addEventListener("themechange", (e) => {
      this.updateColors();
    });
    
    settings.listen("siteTheme", (value) => {
      if (value !== undefined) {
        this.useSiteTheme = value;
      }
    });
    
    tabEvent.on("tab-selected", this.updateColors.bind(this));
  }

  public updateFromThemeColor(color, tabId) {
    if (!color) {
      updateTab(tabId, {
        themeColor: null,
      });
      return;
    }

    const rgb = getColorFromString(color);
    const rgbAdjusted = adjustColorForTheme(rgb);

    updateTab(tabId, {
      themeColor: {
        color: getRGBString(rgbAdjusted),
        textColor: getTextColor(rgbAdjusted),
        isLowContrast: isLowContrast(rgbAdjusted),
      },
    });
  }

  public updateFromImage(favicons, tabId, callback) {
    // private tabs always use a special color, we don't need to get the icon
    if (getTab(tabId).private === true) {
      return;
    }

    requestIdleCallback(
      () => {
        colorExtractorImage.onload = (e) => {
          const backgroundColor = getColorFromImage();
          const backgroundColorAdjusted = adjustColorForTheme(backgroundColor);

          updateTab(tabId, {
            backgroundColor: {
              color: getRGBString(backgroundColorAdjusted),
              textColor: getTextColor(backgroundColorAdjusted),
              isLowContrast: isLowContrast(backgroundColorAdjusted),
            },
            favicon: {
              url: favicons[0],
              luminance: getLuminance(backgroundColor),
            },
          });

          if (callback) {
            callback();
          }
        };
        colorExtractorImage.src = favicons[0];
      },
      {
        timeout: 1000,
      }
    );
  }

  public updateColors() {
    // const tab = tasks.tabs.get(tasks.tabs.getSelected()!);
    // const tab = currentTab();

    // private tabs have their own color scheme
    if (currentTab().private) {
      return setColor(defaultColors.private[0], defaultColors.private[1]);
    }

    if (this.useSiteTheme) {
      // use the theme color
      if (currentTab().themeColor && currentTab().themeColor.color) {
        return setColor(
          currentTab().themeColor.color,
          currentTab().themeColor.textColor,
          currentTab().themeColor.isLowContrast
        );
      }

      // use the colors extracted from the page icon
      if (currentTab().backgroundColor && currentTab().backgroundColor.color) {
        return setColor(
          currentTab().backgroundColor.color,
          currentTab().backgroundColor.textColor,
          currentTab().backgroundColor.isLowContrast
        );
      }
    }

    // otherwise use the default colors
    if (window.isDarkMode) {
      return setColor(defaultColors.darkMode[0], defaultColors.darkMode[1]);
    }
    return setColor(defaultColors.lightMode[0], defaultColors.lightMode[1]);
  }
}

export default new TabColor();
