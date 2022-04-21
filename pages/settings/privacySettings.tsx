import { l } from "../../localization/view";
import settings from "../../js/util/settings/settingsContent";
import { For, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { formatNumber } from "../../js/util/format";

// used for showing localized strings
type ContentType = "scripts" | "images";

const contentTypeSettingNames: Record<ContentType, string> = {
  scripts: "settingsBlockScriptsToggle",
  images: "settingsBlockImagesToggle",
};

const contentTypes: Record<ContentType, string> = {
  scripts: "script",
  images: "image",
};

const [state, setState] = createStore({
  blockedCount: "0",
  blockLevel: 1,
  exceptionDomains: "",
  contentTypes: [],
});

function updateBlockLevel(level: number = 0) {
  setState("blockLevel", level);
  settings.get("filtering", (value) => {
    if (!value) value = {};
    value.blockingLevel = level;
    settings.set("filtering", value);
  });
}

settings.listen("filteringBlockedCount", (value) => {
  setState("blockedCount", formatNumber(value));
});

settings.get("filtering", (value) => {
  if (value && value.blockingLevel !== undefined) {
    setState("blockLevel", value.blockingLevel);
  }

  if (value && value.exceptionDomains && value.exceptionDomains.length > 0) {
    setState("exceptionDomains", value.exceptionDomains.join(", "));
  }

  if (value && value.contentTypes) {
    setState("contentTypes", value.contentTypes ?? []);
  }
});

const handleExceptionsChange = (e: Event & { target: HTMLTextAreaElement }) => {
  setState("exceptionDomains", e.target.value);

  const newValue = e.target.value
    .split(",")
    .map((i) => i.trim().replace("http://", "").replace("https://", ""))
    .filter((i) => !!i);

  settings.get("filtering", (value) => {
    if (!value) value = {};
    value.exceptionDomains = newValue;
    settings.set("filtering", value);
  });
};

const ContentBlockingInformation = () => {
  return (
    <div id="content-blocking-information">
      <div>
        <label for="content-blocking-exceptions">
          {l("settingsContentBlockingExceptions")}
        </label>
        <textarea
          spellcheck={false}
          id="content-blocking-exceptions"
          style="width: 100%; max-width: 500px"
          // @ts-ignore
          onChange={handleExceptionsChange}
          rows="1"
        />
      </div>
      <a
        id="customize-filters-link"
        href="https://github.com/minbrowser/min/wiki/Content-blocking-settings"
      >
        {l("settingsCustomizeFiltersLink")}
      </a>
    </div>
  );
};

const handleContentTypeChange = (
  type: ContentType,
  e: Event & { target: HTMLInputElement }
) => {
  settings.get("filtering", (value) => {
    if (!value) value = {};
    if (!value.contentTypes) value.contentTypes = [];

    if (e.target.checked) value.contentTypes.push(type);
    else value.contentTypes.splice(value.contentTypes.indexOf(type), 1);
    setState("contentTypes", value.contentTypes);

    settings.set("filtering", value);
  });
};

function ContentTypeSettings() {
  return (
    <div id="content-type-blocking">
      <For each={["scripts", "images"] as ContentType[]}>
        {(type) => {
          const id = `content-block-${contentTypes[type]}`;

          return (
            <div class="setting-section">
              <input
                id={id}
                type="checkbox"
                checked={state.contentTypes.includes(type)}
                //  @ts-ignore
                onChange={[handleContentTypeChange, type]}
              />
              <label for={id}>{l(contentTypeSettingNames[type])}</label>
            </div>
          );
        }}
      </For>
    </div>
  );
}

export const PrivacySettings = () => {
  return (
    <div class="settings-container" id="privacy-settings-container">
      <h3>{l("settingsPrivacyHeading")}</h3>

      <div class="settings-info-subheading" id="content-blocking-statistics">
        <i class="i carbon:manage-protection" />
        <span
          data-string="settingsBlockedRequestCount"
          data-allowHTML
          id="content-blocking-blocked-requests"
          innerHTML={l("settingsBlockedRequestCount").replace(
            "{{blockedCount}}",
            state.blockedCount
          )}
        />
      </div>

      <div class="setting-section" id="tracking-level-container">
        <div
          class="setting-option"
          classList={{ selected: state.blockLevel === 0 }}
        >
          <input
            type="radio"
            name="blockingLevel"
            id="blocking-allow-all"
            checked={state.blockLevel === 0}
            onChange={(e) => updateBlockLevel(0)}
          />
          <label for="blocking-allow-all">
            {l("settingsContentBlockingLevel0")}
          </label>
        </div>

        <div
          class="setting-option"
          classList={{ selected: state.blockLevel === 1 }}
        >
          <input
            type="radio"
            name="blockingLevel"
            id="blocking-third-party"
            checked={state.blockLevel === 1}
            onChange={(e) => updateBlockLevel(1)}
          />
          <label for="blocking-third-party">
            {l("settingsContentBlockingLevel1")}
          </label>

          <Show when={state.blockLevel === 1}>
            <ContentBlockingInformation />
          </Show>
        </div>

        <div
          class="setting-option"
          classList={{ selected: state.blockLevel === 2 }}
        >
          <input
            type="radio"
            name="blockingLevel"
            id="blocking-block-all"
            checked={state.blockLevel === 2}
            onChange={(e) => updateBlockLevel(2)}
          />

          <label for="blocking-block-all">
            {l("settingsContentBlockingLevel2")}
          </label>

          <Show when={state.blockLevel === 2}>
            <ContentBlockingInformation />
          </Show>
        </div>
      </div>

      <ContentTypeSettings />
    </div>
  );
};
