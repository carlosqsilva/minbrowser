import "../../js/util/theme/view";
import { render } from "solid-js/web";

import { PrivacySettings } from "./privacySettings";
import { AppearanceSettings } from "./appearanceSettings";
import { FeatureSettings } from "./featureSettings";
import { SearchSettings } from "./searchSettings";
import { ProxySettings } from "./proxySettings";
import { PasswordSettings } from "./passwordSettings";
import { ShortcutSettings } from "./shortcutSettings";
import { BannerSettings } from "./bannerSettings";

import { l } from "../../localization/view";

document.title = l("settingsPreferencesHeading") + " | Min";

function App() {
  return (
    <>
      <div class="short-hero blue-gradient-background">
        <div class="container">
          <h2>{l("settingsPreferencesHeading")}</h2>
        </div>
      </div>

      <PrivacySettings />
      <AppearanceSettings />
      <FeatureSettings />
      <SearchSettings />
      <ProxySettings />
      <PasswordSettings />
      <ShortcutSettings />
      <BannerSettings />
    </>
  );
}

render(() => <App />, document.getElementById("root"));
