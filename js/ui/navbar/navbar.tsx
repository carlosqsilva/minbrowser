import { ComponentProps, onMount } from "solid-js";
import { createStore } from "solid-js/store";
import { currentTab, tabEvent } from "../store";
import { AddTabButton } from "./addTabButton";

import { l } from "../../../localization";

import webviews from "../webviewUtils";
import { TabEditor } from "../tabEditor";
import { Tabs } from "./tabs";

interface State {
  canGoForward: boolean;
  containerHidden: boolean;
  backButtonDisabled: boolean;
  forwardButtonDisabled: boolean;
  tabsScrollbarDisabled: boolean;
}

export const Navbar = (props: ComponentProps<"div">) => {
  const [state, setState] = createStore<State>({
    canGoForward: false,
    containerHidden: false,
    backButtonDisabled: true,
    forwardButtonDisabled: true,
    tabsScrollbarDisabled: false,
  });

  const update = () => {
    if (!currentTab()?.url) {
      setState({
        backButtonDisabled: true,
        forwardButtonDisabled: true,
      });
      return;
    }

    webviews.callAsync(currentTab()?.id, "canGoBack", (err, canGoBack) => {
      if (err) return;
      setState({ backButtonDisabled: !canGoBack });
    });

    webviews.callAsync(
      currentTab()?.id,
      "canGoForward",
      (err, canGoForward) => {
        if (err) return;
        setState({ canGoForward, forwardButtonDisabled: !canGoForward });
      }
    );
  };

  onMount(() => {
    tabEvent.on("tab-selected", update);
    webviews.bindEvent("did-navigate", update);
    webviews.bindEvent("did-navigate-in-page", update);
  });

  return (
    <div
      id="navbar"
      class="theme-background-color theme-text-color windowDragHandle"
      tabindex="-1"
    >
      <div
        id="toolbar-navigation-buttons"
        onMouseEnter={() => setState({ tabsScrollbarDisabled: true })}
        onMouseLeave={() => setState({ tabsScrollbarDisabled: false })}
        classList={{
          ["can-go-forward"]: state.canGoForward,
        }}
      >
        <button
          tabindex="-1"
          id="back-button"
          disabled={state.backButtonDisabled}
          title={l("goBack")}
          class="navbar-action-button i carbon:chevron-left"
          onClick={() => {
            webviews.goBackIgnoringRedirects(currentTab()?.id);
          }}
        />
        <button
          tabindex="-1"
          id="forward-button"
          title={l("goForward")}
          disabled={state.forwardButtonDisabled}
          class="navbar-action-button i carbon:chevron-right"
          onClick={() => {
            webviews.callAsync(currentTab()?.id, "goForward");
          }}
        />
      </div>

      <div id="tabs">
        <TabEditor />
        <div
          id="tabs-inner"
          role="tablist"
          class="has-thin-scrollbar"
          classList={{
            ["disable-scroll"]: state.tabsScrollbarDisabled,
          }}
        >
          <Tabs />
        </div>
      </div>

      <div class="navbar-right-actions">
        <AddTabButton />
      </div>
    </div>
  );
};
