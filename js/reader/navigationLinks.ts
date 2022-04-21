interface Link {
  text: string
  href: string
  selected: boolean
}

export function extractNavigationLinks(doc: Document, location: URL) {
  try {
    // URL parsing can fail, but this shouldn't prevent the article from displaying

    const currentDir = location.pathname
      .split("/")
      .slice(0, -1)
      .join("/");

    let items = (
      Array.from(
        doc.querySelectorAll(
          '[class*="menu"] a, [class*="navigation"] a, header li a, [role=tabpanel] a, nav a'
        )
      ) as HTMLAnchorElement[]
    )
      .filter((el) => {
        let n = el;
        while (n) {
          if (n.className.includes("social")) {
            return false;
          }
          // @ts-ignore
          n = n.parentElement;
        }
        return true;
      })
      .filter(
        (el) =>
          el.getAttribute("href") &&
          !el.getAttribute("href").startsWith("#") &&
          !el.getAttribute("href").startsWith("javascript:")
      )
      .filter((el) => {
        const url = new URL(el.href);
        const dir = url.pathname.split("/").slice(0, -1).join("/");

        // we want links that go to different sections of the site, so links to the same directory as the current article should be excluded
        if (dir === currentDir) {
          return false;
        }

        // links that go to different domains probably aren't relevant
        if (
          url.hostname.replace("www.", "") !==
          location.hostname.replace("www.", "")
        ) {
          return false;
        }

        return true;
      })
      .filter(
        (el) =>
          el.textContent.trim() &&
          el.textContent.trim().replace(/\s+/g, " ").length < 65
      );

    // remove duplicates
    const itemURLSet = items.map((item) => new URL(item.href).toString());

    items = items.filter(
      (item, idx) => itemURLSet.indexOf(new URL(item.href).toString()) === idx
    );

    // show links up to a character limit (so they all mostly fit in one line)
    // TODO maybe have a way to show more links (dropdown menu?)
    let accumulatedLength = 0;

    const articleURL = location.toString()
    const links: Link[] = [];
    for (const item of items) {
      accumulatedLength += item.textContent.length + 2;
      if (accumulatedLength > 125) {
        continue;
      }

      // need to use articleURL as base URL to parse relative links correctly
      const realURL = new URL(item.getAttribute("href"), articleURL);

      const isSelected =
        realURL.pathname !== "/" && articleURL.startsWith(realURL.toString());

      links.push({
        text: item.textContent,
        href: realURL.toString(),
        selected: isSelected,
      });
    }

    return links
  } catch (e) {
    console.warn("error extracting navigation links", e);
  }
}
