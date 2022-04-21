import { createSignal, For, Show } from "solid-js";
import { render } from "solid-js/web";
import { createStore } from "solid-js/store";
import { Readability } from "@mozilla/readability";

import {
  extractDate,
  parseResponse,
  extractNavigationLinks,
} from "../js/reader";
import { isNight, metaThemeValues } from "./readerTheme";
import settings from "../js/util/settings/settingsContent";
import { l } from "../localization/view";

let articleIframe: HTMLIFrameElement;

const metaThemeElement = document.getElementById(
  "meta-theme"
) as HTMLMetaElement;

const articleURL = new URLSearchParams(window.location.search).get("url");
const articleLocation = new URL(articleURL);

type ArticleType = Partial<ReturnType<Readability["parse"]>>;
type ThemeType = keyof typeof metaThemeValues;
interface ArticleStore {
  article: ArticleType;
  date: string;
  theme: string;
  links: { text: string; href: string; selected: boolean }[];
  icon: {
    href: string;
    image: string;
  };
}

const [article, setArticle] = createStore<ArticleStore>({
  article: null,
  links: [],
  theme: null,
  date: null,
  icon: {
    href: articleLocation.protocol + "//" + articleLocation.host,
    image:
      articleLocation.protocol + "//" + articleLocation.host + "/favicon.ico",
  },
});

const [dropdownVisible, setDropdownVisible] = createSignal(false);

function setTheme(theme: ThemeType) {
  document.body.setAttribute("theme", theme);
  metaThemeElement.content = metaThemeValues[theme];

  console.log(articleIframe.contentDocument.body , theme)
  
  if (articleIframe && articleIframe.contentDocument) {
    articleIframe.contentDocument.body.setAttribute("theme", theme);
  }

  if (isNight()) {
    settings.set('readerNightTheme', theme)
  } else {
    settings.set('readerDayTheme', theme)
  }

  setArticle("theme", theme);
}

function setReaderTheme() {
  settings.get("darkMode", (globalDarkModeEnabled) => {
    settings.get("readerDayTheme", (readerDayTheme) => {
      settings.get("readerNightTheme", (readerNightTheme) => {
        if (isNight() && readerNightTheme) {
          setTheme(readerNightTheme);
        } else if (!isNight() && readerDayTheme) {
          setTheme(readerDayTheme);
        } else if (
          globalDarkModeEnabled === 1 ||
          globalDarkModeEnabled === true ||
          isNight()
        ) {
          setTheme("dark");
        } else {
          setTheme("light");
        }
      });
    });
  });
}

setReaderTheme();

function setReaderFrameSize() {
  // it's possible to end up in a loop where resizing creates an extra scrollbar, which increases the height,
  // and then on the next resize, the frame gets taller, which makes the scrollbar go away, decreasing the height...
  // adding an extra 1% of space fixes this
  articleIframe.height =
    articleIframe.contentDocument.body.querySelector(".reader-main")
      .scrollHeight *
      1.01 +
    "px";
}

function processArticle(data) {
  const parserframe = document.createElement("iframe");
  parserframe.className = "temporary-frame";
  parserframe.sandbox.add("allow-same-origin");
  document.body.appendChild(parserframe);

  parserframe.srcdoc = data;

  parserframe.onload = function () {
    // allow readability to parse relative links correctly
    const b = document.createElement("base");
    b.href = articleURL;
    parserframe.contentDocument.head.appendChild(b);

    const doc = parserframe.contentDocument;

    // in order for links to work correctly, they all need to open in a new tab

    const links = doc.querySelectorAll("a");

    if (links) {
      for (let i = 0; i < links.length; i++) {
        links[i].target = "_top";
      }
    }

    /* site-specific workarounds */

    // needed for wikipedia.org

    const images = Array.from(doc.getElementsByTagName("img"));

    if (articleLocation.hostname.includes("wikipedia.org")) {
      images.forEach((image) => {
        if (image.src && image.srcset) {
          image.srcset = "";
        }
      });

      // convert lists that are normally rendered collapsed into <details> elements
      // example: https://en.wikipedia.org/wiki/Constitution_of_the_United_States
      const collapsedLists = Array.from(
        doc.querySelectorAll(".NavFrame.collapsed")
      );

      collapsedLists.forEach((list) => {
        const innerEl = list.querySelector(".NavContent");
        if (innerEl) {
          const det = doc.createElement("details");

          const heading = list.querySelector(".NavHead");

          if (heading) {
            const sum = doc.createElement("summary");
            // @ts-ignore
            sum.childNodes = heading.childNodes;
            heading.remove();
            sum.appendChild(heading);
            det.appendChild(sum);
          }

          const root = innerEl.parentNode;
          innerEl.remove();
          det.appendChild(innerEl);
          root.appendChild(det);
        }
      });
    }

    if (articleLocation.hostname === "medium.com") {
      // medium.com - show high-resolution images
      const mediumImageRegex =
        /(?<=https?:\/\/miro.medium.com\/max\/)([0-9]+)(?=\/)/;
      images.forEach((image) => {
        if (image.src) {
          // for gifs
          image.src = image.src.replace("/freeze/", "/");
          if (mediumImageRegex.test(image.src)) {
            image.src = image.src.replace(mediumImageRegex, "2000");
          }
        } else {
          // empty images (for lazy loading) mess up paragraph spacing
          image.remove();
        }
      });
    }

    setArticle({
      date: extractDate(doc, articleURL),
      links: extractNavigationLinks(doc, articleLocation),
      article: new Readability(doc).parse(),
    });

    document.body.removeChild(parserframe);
  };
}

fetch(articleURL, {
  credentials: "include",
  cache: "force-cache",
})
  .then(parseResponse)
  .then(processArticle)
  .catch((data) => {
    console.warn("request failed with error", data);

    setArticle("article", {
      content: "<em>Failed to load article.</em>",
    });
  });

const articleContent = (article: ArticleType, date?: string) => {
  return `
    <link rel="stylesheet" href="readerContent.css" />
    <div class="reader-main">
      <h1 class="article-title">${article.title || ""}</h1>
      <h2 class="article-authors">
        ${article.byline ?? ""} ${date ? `( ${date})` : ""}
      </h2>
      <div innerHTML={article.content} />
        ${article.content}
      </div>
    </div>`;
};

function onLoadArticle() {
  const links = articleIframe.contentDocument.querySelectorAll("a");

  if (links) {
    for (let i = 0; i < links.length; i++) {
      // if the link is to the same page, it needs to be handled differently
      try {
        const href = new URL(links[i].href);
        if (
          href.hostname === articleLocation.hostname &&
          href.pathname === articleLocation.pathname &&
          href.search === articleLocation.search
        ) {
          links[i].addEventListener("click", (e) => {
            e.preventDefault();
            articleIframe.contentWindow.location.hash = href.hash;
          });
        }
      } catch (e) {}
    }
  }

  setReaderTheme();
  requestAnimationFrame(() => {
    setReaderFrameSize();
    requestAnimationFrame(() => {
      articleIframe.focus(); // allows spacebar page down and arrow keys to work correctly
    });
  });

  window.addEventListener("resize", setReaderFrameSize);
}

const Article = () => {
  return (
    <Show when={article.article} fallback={<div>loading...</div>}>
      <iframe
        class="reader-frame"
        ref={articleIframe}
        onload={onLoadArticle}
        height={String(window.innerHeight - 68)}
        srcdoc={articleContent(article.article, article.date)}
        sandbox="allow-same-origin allow-top-navigation allow-modals"
      />
    </Show>
  );
};

const SettingsDropdown = () => {
  const toggleDropdown = (e: MouseEvent) => {
    setDropdownVisible((visible) => !visible);
  };

  return (
    <>
      <button
        id="settings-button"
        class="i carbon:settings-adjust"
        onClick={toggleDropdown}
        title={l("buttonReaderSettings")}
      />

      <div id="settings-dropdown" hidden={!dropdownVisible()}>
        <div class="setting-section">
          <button
            class="theme-circle"
            classList={{ selected: article.theme === "light" }}
            onClick={() => setTheme("light")}
            data-theme="light"
            title={l("buttonReaderLightTheme")}
          />
          <button
            class="theme-circle"
            classList={{ selected: article.theme === "sepia" }}
            onClick={() => setTheme("sepia")}
            data-theme="sepia"
            title={l("buttonReaderSepiaTheme")}
          />
          <button
            class="theme-circle"
            classList={{ selected: article.theme === "dark" }}
            onClick={() => setTheme("dark")}
            data-theme="dark"
            title={l("buttonReaderDarkTheme")}
          />
        </div>
      </div>
    </>
  );
};

const NavLinks = () => {
  return (
    <div id="site-nav-links">
      <a class="site-icon-link" href={article.icon.href}>
        <img class="site-icon" src={article.icon.image} />
      </a>
      <For each={article.links}>
        {(link) => (
          <a href={link.href} classList={{ selected: link.selected }}>
            {link.text}
          </a>
        )}
      </For>
    </div>
  );
};

const BackButton = () => {
  const handleClick = () => {
    window.location.assign(articleURL);
  };
  return (
    <div id="backtoarticle">
      <a id="backtoarticle-link" onClick={handleClick}>
        <i class="i carbon:chevron-left"></i>
        <span>{l("articleReaderView")}</span>
      </a>
    </div>
  );
};

function App() {
  return (
    <>
      <SettingsDropdown />
      <NavLinks />
      <BackButton />
      <Article />
    </>
  );
}

render(() => <App />, document.getElementById("root"));

/* these functions are called from the parent process */
const parentProcessActions = {
  printArticle: () => {
    articleIframe?.contentWindow?.print?.();
  },
};
