import * as browserUI from "../browserUI";
import { l } from "../../../localization/view";
import { createNewTab } from "../store";

export const AddTabButton = () => {
  return (
    <button
      id="add-tab-button"
      class="navbar-action-button i carbon:add"
      title={l("newTabAction")}
      tabindex="-1"
      onClick={() => browserUI.addTab(createNewTab(), { enterEditMode: true })}
    />
  );
};
