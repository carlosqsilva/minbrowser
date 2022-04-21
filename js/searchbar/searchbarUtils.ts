import { urlParser } from "../util/urlParser";

let lastItemDeletion = Date.now(); // TODO get rid of this

// creates a result item

/*
data:

title: string - the title of the item
metadata: array - a list of strings to include (separated by hyphens) in front of the secondary text
secondaryText: string - the item's secondary text
icon: string - the name of a carbon icon.
image: string - the URL of an image to show
iconImage: string - the URL of an image to show as an icon
descriptionBlock: string - the text in the description block,
attribution: string - attribution text to display when the item is focused
delete: function - a function to call to delete the result item when a left swipe is detected
showDeleteButton - whether to show an [x] button that calls the delete function
button: {icon: string, fn: function} a button that will appear to the right of the item (if showDeleteButton is false)
classList: array - a list of classes to add to the item
fakeFocus - boolean - whether the item should appear to be focused,
colorCircle - string - display a color circle with a given color
opacity - number - the opacity of the item
*/

interface ItemData {
  title: string;
  metadata: string[];
  secondaryText: string;
  classList: string[];
  icon: string;
  image: string;
  opacity: number;
  iconImage: string;
  colorCircle: string;
  attribution: string;
  descriptionBlock: string;
  delete: (el: HTMLElement) => void;
  showDeleteButton: boolean;
  fakeFocus: boolean;
  click: (...args: any) => void;
  button: {
    icon: string;
    fn: (self: HTMLButtonElement) => void;
  };
}

export function createItem(data: ItemData) {
  const item = document.createElement("div");
  item.classList.add("searchbar-item");

  item.setAttribute("tabindex", "-1");

  if (data.classList) {
    for (var i = 0; i < data.classList.length; i++) {
      item.classList.add(data.classList[i]);
    }
  }

  if (data.fakeFocus) {
    item.classList.add("fakefocus");
  }

  if (data.opacity) {
    item.style.opacity = String(data.opacity);
  }

  if (data.colorCircle) {
    const colorCircle = document.createElement("div");
    colorCircle.className = "image color-circle";
    colorCircle.style.backgroundColor = data.colorCircle;

    item.appendChild(colorCircle);
  }

  if (data.icon) {
    const el = document.createElement("i");
    el.className = "i " + data.icon;
    item.appendChild(el);
  }

  if (data.title) {
    const title = document.createElement("span");
    title.classList.add("title");

    if (!data.secondaryText) {
      title.classList.add("wide");
    }

    title.textContent = data.title.substring(0, 1000);

    item.appendChild(title);
  }

  if (data.secondaryText) {
    var secondaryText = document.createElement("span");
    secondaryText.classList.add("secondary-text");

    secondaryText.textContent = data.secondaryText.substring(0, 1000);

    item.appendChild(secondaryText);

    if (data.metadata) {
      data.metadata.forEach(function (str) {
        var metadataElement = document.createElement("span");
        metadataElement.className = "md-info";

        metadataElement.textContent = str;

        secondaryText.insertBefore(metadataElement, secondaryText.firstChild);
      });
    }
  }

  if (data.image) {
    var image = document.createElement("img");
    image.className = "image";
    image.src = data.image;

    item.insertBefore(image, item.childNodes[0]);
  }

  if (data.iconImage) {
    var iconImage = document.createElement("img");
    iconImage.className = "icon-image";
    iconImage.src = data.iconImage;
    iconImage.setAttribute("aria-hidden", String(true));

    item.insertBefore(iconImage, item.childNodes[0]);
  }

  let dBlock: HTMLSpanElement | null = null;
  if (data.descriptionBlock) {
    dBlock = document.createElement("span");
    dBlock.classList.add("description-block");

    dBlock.textContent = data.descriptionBlock;
    item.appendChild(dBlock);
  }

  if (data.attribution) {
    const attrBlock = document.createElement("span");
    attrBlock.classList.add("attribution");

    attrBlock.textContent = data.attribution;
    if (dBlock && data.descriptionBlock) {
      // used to make the attribution align with the text even if there's an image on the left
      dBlock.appendChild(attrBlock);
    } else {
      item.appendChild(attrBlock);
    }
  }

  if (data.delete) {
    item.addEventListener("mousewheel", (e) => {
      const self = item;
      if (
        (e as WheelEvent).deltaX > 50 &&
        (e as WheelEvent).deltaY < 3 &&
        Date.now() - lastItemDeletion > 700
      ) {
        lastItemDeletion = Date.now();

        self.style.opacity = "0";
        self.style.transform = "translateX(-100%)";

        setTimeout(() => {
          data.delete(self);
          self.parentNode?.removeChild(self);
          lastItemDeletion = Date.now();
        }, 200);
      }
    });

    item.addEventListener("auxclick", (e) => {
      if (e.which === 2) {
        // middle mouse click
        data.delete(item);
        item.parentNode?.removeChild(item);
      }
    });
  }

  // delete button is just a pre-defined action button
  if (data.showDeleteButton) {
    data.button = {
      icon: "carbon:close",
      fn: () => {
        data.delete(item);
        item.parentNode?.removeChild(item);
      },
    };
  }

  if (data.button) {
    const button = document.createElement("button");
    button.classList.add("action-button");
    button.classList.add("ignores-keyboard-focus"); // for keyboardNavigationHelper
    button.tabIndex = -1;
    button.classList.add("i");
    button.classList.add(data.button.icon);

    button.addEventListener("click", (e) => {
      e.stopPropagation();
      data.button.fn(button);
    });
    item.appendChild(button);
    item.classList.add("has-action-button");
  }

  if (data.click) {
    item.addEventListener("click", data.click);
  }

  item.addEventListener("keydown", (e) => {
    // return should act like click
    if (e.keyCode === 13) {
      item.click();
    }
  });

  return item;
}

export function createHeading(data) {
  const heading = document.createElement("h4");
  heading.className = "searchbar-heading";
  heading.textContent = data.text || "";
  return heading;
}

// attempts to shorten a page title, removing unimportant text like the site name
export function getRealTitle(text: string) {
  // don't try to parse URL's
  if (urlParser.isURL(text)) {
    return text;
  }

  const possibleCharacters = ["|", ":", " - ", " — "];

  for (const char of possibleCharacters) {
    // var char = possibleCharacters[i]
    // match url's of pattern: title | website name
    const titleChunks = text.split(char);

    if (titleChunks.length >= 2) {
      const titleChunksTrimmed = titleChunks.map((c) => c.trim());
      if (
        titleChunksTrimmed[titleChunksTrimmed.length - 1].length < 5 ||
        titleChunksTrimmed[titleChunksTrimmed.length - 1].length /
          text.length <=
          0.3
      ) {
        return titleChunks.slice(0, -1).join(char);
      }
    }
  }

  // fallback to the regular title

  return text;
}

export function createLazyList(scrollRoot: HTMLElement) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const itemIndex = parseInt(entry.target.getAttribute("data-index")!);
          entry.target.parentNode?.replaceChild(
            createItem(dataEntries[itemIndex]),
            entry.target
          );
        }
      });
    },
    {
      root: scrollRoot,
      threshold: 0,
      rootMargin: "750px",
    }
  );

  let itemCount = 0;
  const dataEntries: any = [];

  return {
    createPlaceholder: () => {
      const el = document.createElement("div") as HTMLDivElement;
      el.className = "searchbar-item placeholder";
      el.setAttribute("data-index", String(itemCount));
      itemCount++;
      return el;
    },
    lazyRenderItem: (placeholder, data) => {
      dataEntries.push(data);
      const itemIndex = parseInt(placeholder.getAttribute("data-index"));
      // the intersection observer renders items asynchronously, which causes flickering when the items first appear
      // to avoid this, the first 25 items (roughly ~1 screen) are rendered immediately
      if (itemIndex < 25) {
        placeholder.parentNode.replaceChild(
          createItem(dataEntries[itemIndex]),
          placeholder
        );
      } else {
        observer.observe(placeholder);
      }
    },
  };
}
