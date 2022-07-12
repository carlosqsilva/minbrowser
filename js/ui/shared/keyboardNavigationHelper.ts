/*
Creates a group if items that can be navigated through using arrow keys or the tab key
*/

class KeyboardNavigationHelper {
  public groups = {}; // name: [containers]

  public moveFocus(group: string, direction: number) {
    // 1: forward, -1: backward
    let items: HTMLElement[] = [];
    let realFocusItem!: HTMLElement;
    let fakeFocusItem!: HTMLElement;

    this.groups[group].forEach((container) => {
      items = items.concat(
        Array.from(
          container.querySelectorAll(
            'input:not(.ignores-keyboard-focus), [tabindex="-1"]:not(.ignores-keyboard-focus)'
          )
        )
      );
      if (!realFocusItem) {
        realFocusItem = container.querySelector(":focus");
      }
      if (!fakeFocusItem) {
        fakeFocusItem = container.querySelector(".fakefocus");
      }
    });

    const currentItem = fakeFocusItem || realFocusItem;

    if (!items) {
      return;
    }

    if (!currentItem) {
      items[0].focus();
      return;
    }

    currentItem.classList.remove("fakefocus");

    while (items.length > 1) {
      const index = items.indexOf(currentItem);

      let nextItem!: number;
      if (items[index + direction]) {
        nextItem = index + direction;
      } else if (index === 0 && direction === -1) {
        nextItem = items.length - 1;
      } else if (index === items.length - 1 && direction === 1) {
        nextItem = 0;
      }
      items[nextItem].focus();

      if (document.activeElement !== items[nextItem]) {
        // this item isn't focusable, try again
        items.splice(nextItem, 1);
      } else {
        // done
        break;
      }
    }
  }

  public handleKeypress(group, e) {
    if (e.keyCode === 9 && e.shiftKey) {
      // shift+tab
      e.preventDefault();
      this.moveFocus(group, -1);
    } else if (e.keyCode === 9 || e.keyCode === 40) {
      // tab or arrowdown key
      e.preventDefault();
      this.moveFocus(group, 1);
    } else if (e.keyCode === 38) {
      // arrowup key
      e.preventDefault();
      this.moveFocus(group, -1);
    }
  }

  public addToGroup(group: string, container: HTMLElement) {
    if (!this.groups[group]) {
      this.groups[group] = [];
    }

    // insert the containers so that they are ordered based on DOM position
    let pos = 0;
    while (
      pos <= this.groups[group].length - 1 &&
      // compareDocumentPosition is a bit of an unusual API
      this.groups[group][pos].compareDocumentPosition(container) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ) {
      pos++;
    }
    this.groups[group].splice(pos, 0, container);

    container?.addEventListener("keydown", (e) => {
      this.handleKeypress(group, e);
    });
  }
}

export default new KeyboardNavigationHelper();
