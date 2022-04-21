import { state } from "./state";

export const TabEditor = () => {
  return (
    <div id="tab-editor" hidden={state.editorHidden}>
      <input id="tab-editor-input" class="mousetrap" spellcheck={false} />
    </div>
  );
};
