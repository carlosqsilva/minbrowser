import { currentTab, tabEvent, updateTabs } from "../store";

class TabActivity {
  public minFadeAge = 330000;

  public refresh() {
    requestAnimationFrame(() => {
      const selected = currentTab()?.id;
      const time = Date.now();

      updateTabs((tab) => {
        return {
          faded:
            selected === tab.id
              ? false // never fade the current tab
              : time - tab.lastActivity > this.minFadeAge,
        };
      });
    });
  }

  constructor() {
    setInterval(() => this.refresh(), 7500);

    tabEvent.on("tab-selected", this.refresh.bind(this));
  }
}

export default new TabActivity();
