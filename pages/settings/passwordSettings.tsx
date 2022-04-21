import { l } from "../../localization/view";

export const PasswordSettings = () => {
  return (
    <div class="settings-container" id="password-autofill-container">
      <h3>{l("settingsPasswordAutoFillHeadline")}</h3>

      <div class="setting-section" id="keychain-view-link">
        <a
          onClick={(e) => {
            e.preventDefault();
            postMessage({ message: "showCredentialList" });
          }}
        >
          {l("keychainViewPasswords")}
        </a>
      </div>
    </div>
  );
};
