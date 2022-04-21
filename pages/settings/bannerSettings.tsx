import { l } from "../../localization/view";
import { createSignal } from "solid-js";

const [isHidden, setHidden] = createSignal(true);

export const showRestartRequiredBanner = () => {
  setHidden(false);
};

export const BannerSettings = () => {
  return (
    <div
      role="alert"
      class="banner yellow-background"
      id="restart-required-banner"
      hidden={isHidden()}
    >
      <div class="container">
        <i class="i carbon:information" />
        <span>{l("settingsRestartRequired")}</span>
      </div>
    </div>
  );
};
