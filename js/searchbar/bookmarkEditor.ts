// @ts-check

import { places } from "../places/places";
import * as autocomplete from "../util/autocomplete";
import { l } from "../../localization";
import { Place } from "../util/database";

interface Bookmarker {
  bookmark: Place;
  editor: HTMLDivElement;
  onClose: (...arg: any) => void;
}

class BookmarkEditor {
  public currentInstance: Partial<Bookmarker> | null = null;
  public getTagElement(
    tag: string,
    selected: boolean,
    onClick,
    options: any = {}
  ) {
    const el = document.createElement("button");
    el.className = "tag";
    el.textContent = tag;
    if (selected) {
      el.classList.add("selected");
      el.setAttribute("aria-pressed", String(true));
    } else {
      el.classList.add("suggested");
      el.setAttribute("aria-pressed", String(false));
    }
    el.addEventListener("click", () => {
      onClick();
      if (el.classList.contains("selected") && options.autoRemove !== false) {
        el.remove();
      } else {
        el.classList.remove("suggested");
        el.classList.add("selected");
      }
    });
    return el;
  }

  public async render(url: string, options: any = {}) {
    this.currentInstance = {};
    // TODO make places API return a promise
    this.currentInstance.bookmark = (await new Promise((resolve) => {
      places.getItem(url, (item) => resolve(item));
    })) as Place;

    const editor = document.createElement("div");
    editor.className = "bookmark-editor searchbar-item";

    if (options.simplified) {
      editor.className += " simplified";
    }

    if (!options.simplified) {
      // title input
      const title = document.createElement("span");
      title.className = "title wide";
      title.textContent = this.currentInstance.bookmark.title;
      editor.appendChild(title);

      // URL
      const URLSpan = document.createElement("div");
      URLSpan.className = "bookmark-url";
      URLSpan.textContent = this.currentInstance.bookmark.url;
      editor.appendChild(URLSpan);
    }

    // tag area
    const tagArea = document.createElement("div");
    tagArea.className = "tag-edit-area";
    editor.appendChild(tagArea);

    if (!options.simplified) {
      // save button
      const saveButton = document.createElement("button");
      saveButton.className = "action-button always-visible i carbon:checkmark";
      saveButton.tabIndex = -1;
      editor.appendChild(saveButton);
      saveButton.addEventListener("click", () => {
        editor.remove();
        this.currentInstance?.onClose?.(this.currentInstance.bookmark);
        this.currentInstance = null;
      });
    }

    // delete button
    const delButton = document.createElement("button");
    delButton.className =
      "action-button always-visible bookmark-delete-button i carbon:delete";
    delButton.tabIndex = -1;
    editor.appendChild(delButton);
    delButton.addEventListener("click", () => {
      editor.remove();
      this.currentInstance?.onClose?.(null);
      this.currentInstance = null;
    });

    const tags = {
      selected: [],
      suggested: [],
    } as { selected: string[]; suggested: string[] };

    // show tags
    this.currentInstance.bookmark.tags.forEach((tag) => {
      tagArea.appendChild(
        this.getTagElement(tag, true, () => {
          places.toggleTag(this.currentInstance?.bookmark?.url!, tag);
        })
      );
    });

    tags.selected = this.currentInstance.bookmark.tags!;

    places.getSuggestedTags(
      this.currentInstance.bookmark.url,
      (suggestions) => {
        tags.suggested = tags.suggested.concat(suggestions);

        tags.suggested
          .filter((tag, idx) => {
            return (
              tags.suggested.indexOf(tag) === idx &&
              !tags.selected.includes(tag)
            );
          })
          .slice(0, 3)
          .forEach((tag, idx) => {
            tagArea.appendChild(
              this.getTagElement(tag, false, () => {
                places.toggleTag(this.currentInstance?.bookmark?.url!, tag);
              })
            );
          });
        // add option for new tag
        const newTagInput = document.createElement("input");
        newTagInput.className = "tag-input";
        newTagInput.placeholder = l("bookmarksAddTag");
        newTagInput.classList.add("mousetrap");
        newTagInput.spellcheck = false;
        tagArea.appendChild(newTagInput);

        newTagInput.addEventListener("keypress", (e) => {
          if (e.keyCode !== 8 && e.keyCode !== 13) {
            places.getAllTagsRanked(
              this.currentInstance?.bookmark?.url!,
              (results) => {
                autocomplete.autocomplete(
                  newTagInput,
                  results.map((r) => r.tag)
                );
              }
            );
          }
        });

        newTagInput.addEventListener("change", () => {
          const val = newTagInput.value;
          if (!tags.selected.includes(val)) {
            places.toggleTag(this.currentInstance?.bookmark?.url!, val);
            tagArea.insertBefore(
              this.getTagElement(val, true, () => {
                places.toggleTag(this.currentInstance?.bookmark?.url!, val);
              }),
              tagArea.firstElementChild
            );
          }
          newTagInput.value = "";
        });

        if (options.autoFocus) {
          newTagInput.focus();
        }
      }
    );

    return editor;
  }
  public show(url: string, replaceItem, onClose, options: any) {
    if (this.currentInstance) {
      if (
        this.currentInstance.editor &&
        this.currentInstance.editor.parentNode
      ) {
        this.currentInstance.editor.remove();
      }
      if (this.currentInstance.onClose) {
        this.currentInstance.onClose(this.currentInstance.bookmark);
      }
      this.currentInstance = null;
    }

    this.render(url, options).then((editor) => {
      replaceItem.hidden = true;
      replaceItem.parentNode.insertBefore(editor, replaceItem);
      if (this.currentInstance) {
        this.currentInstance.editor = editor;
        this.currentInstance.onClose = onClose;
      }
    });
  }
}

export const bookmarkEditor = new BookmarkEditor();
