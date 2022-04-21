import { ComponentProps } from "solid-js";
import { l } from "../../localization/view";

export const Navbar = ({ children }: ComponentProps<"div">) => {
  return (
    <div
      id="navbar"
      class="theme-background-color theme-text-color windowDragHandle"
      tabindex="-1"
    >
      <div id="toolbar-navigation-buttons" hidden>
        <button
          id="back-button"
          class="navbar-action-button i carbon:chevron-left"
          title={l("goBack")}
          tabindex="-1"
        />
        <button
          id="forward-button"
          class="navbar-action-button i carbon:chevron-right"
          title={l("goForward")}
          tabindex="-1"
        />
      </div>
      <div id="tabs">
        {children}
      </div>
      <div class="navbar-right-actions">
        <button
          id="add-tab-button"
          class="navbar-action-button i carbon:add"
          title={l("newTabAction")}
          tabindex="-1"
        />
      </div>
    </div>
  );
};
