import webviews from "../webviews";
import settings from "../util/settings/settings";
import PasswordManagers from "./passwordManager";

import { l } from "../../localization";

class PasswordCapture {
  public bar = document.getElementById(
    "password-capture-bar"
  ) as HTMLDivElement;
  public description = document.getElementById(
    "password-capture-description"
  ) as HTMLDivElement;
  public usernameInput = document.getElementById(
    "password-capture-username"
  ) as HTMLInputElement;
  public passwordInput = document.getElementById(
    "password-capture-password"
  ) as HTMLInputElement;
  public revealButton = document.getElementById(
    "password-capture-reveal-password"
  ) as HTMLButtonElement;
  public saveButton = document.getElementById(
    "password-capture-save"
  ) as HTMLButtonElement;
  public neverSaveButton = document.getElementById(
    "password-capture-never-save"
  ) as HTMLButtonElement;
  public closeButton = document.getElementById(
    "password-capture-ignore"
  ) as HTMLButtonElement;
  public currentDomain: string | null = null;
  public barHeight = 0;

  public showCaptureBar(username: string, password: string) {
    this.description.textContent = l("passwordCaptureSavePassword").replace(
      "%s",
      this.currentDomain!
    );
    this.bar.hidden = false;

    this.passwordInput.type = "password";
    this.revealButton.classList.add("carbon:view");
    this.revealButton.classList.remove("carbon:view-off");

    this.usernameInput.value = username || "";
    this.passwordInput.value = password || "";

    this.barHeight = this.bar.getBoundingClientRect().height;
    webviews.adjustMargin([this.barHeight, 0, 0, 0]);
  }

  public hideCaptureBar() {
    webviews.adjustMargin([this.barHeight * -1, 0, 0, 0]);

    this.bar.hidden = true;
    this.usernameInput.value = "";
    this.passwordInput.value = "";
    this.currentDomain = null;
  }

  public togglePasswordVisibility() {
    if (this.passwordInput.type === "password") {
      this.passwordInput.type = "text";
      this.revealButton.classList.remove("carbon:view");
      this.revealButton.classList.add("carbon:view-off");
    } else {
      this.passwordInput.type = "password";
      this.revealButton.classList.add("carbon:view");
      this.revealButton.classList.remove("carbon:view-off");
    }
  }

  public handleRecieveCredentials(tab, args, frameId) {
    let domain = args[0][0];

    if (domain.startsWith("www.")) {
      domain = domain.slice(4);
    }

    if (
      settings.get("passwordsNeverSaveDomains") &&
      settings.get("passwordsNeverSaveDomains").includes(domain)
    ) {
      return;
    }

    var username = args[0][1] || "";
    var password = args[0][2] || "";

    PasswordManagers.getConfiguredPasswordManager().then((manager) => {
      if (!manager || !manager.saveCredential) {
        // the password can't be saved
        return;
      }

      // check if this username/password combo is already saved
      manager.getSuggestions(domain).then((credentials) => {
        var alreadyExists = credentials.some(
          (cred) => cred.username === username && cred.password === password
        );

        if (!alreadyExists) {
          if (!this.bar.hidden) {
            this.hideCaptureBar();
          }

          this.currentDomain = domain;
          this.showCaptureBar(username, password);
        }
      });
    });
  }

  constructor() {
    this.usernameInput.placeholder = l("username");
    this.passwordInput.placeholder = l("password");

    webviews.bindIPC(
      "password-form-filled",
      this.handleRecieveCredentials.bind(this)
    );

    this.saveButton.addEventListener("click", () => {
      if (
        this.usernameInput.checkValidity() &&
        this.passwordInput.checkValidity()
      ) {
        PasswordManagers.getConfiguredPasswordManager().then((manager) => {
          manager.saveCredential(
            this.currentDomain,
            this.usernameInput.value,
            this.passwordInput.value
          );

          this.hideCaptureBar();
        });
      }
    });

    this.neverSaveButton.addEventListener("click", () => {
      settings.set(
        "passwordsNeverSaveDomains",
        (settings.get("passwordsNeverSaveDomains") || []).concat([
          this.currentDomain,
        ])
      );
      this.hideCaptureBar();
    });

    this.closeButton.addEventListener("click", this.hideCaptureBar.bind(this));
    this.revealButton.addEventListener(
      "click",
      this.togglePasswordVisibility.bind(this)
    );

    // the bar can change height when the window is resized, so the webview needs to be resized in response
    window.addEventListener("resize", () => {
      if (!this.bar.hidden) {
        var oldHeight = this.barHeight;
        this.barHeight = this.bar.getBoundingClientRect().height;
        webviews.adjustMargin([this.barHeight - oldHeight, 0, 0, 0]);
      }
    });
  }
}

export default new PasswordCapture();
