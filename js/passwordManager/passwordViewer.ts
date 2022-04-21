// @ts-check

import webviews from "../webviews";
import settings from "../util/settings/settings";
import PasswordManagers from "./passwordManager";
import modalMode from "../modalMode";
import { empty } from "../util/utils";
import { l } from "../../localization";

class PasswordViewer {
  public container = document.getElementById(
    "password-viewer"
  ) as HTMLDivElement;
  public listContainer = document.getElementById(
    "password-viewer-list"
  ) as HTMLDivElement;
  public emptyHeading = document.getElementById(
    "password-viewer-empty"
  ) as HTMLDivElement;
  public closeButton = document.querySelector(
    "#password-viewer .modal-close-button"
  ) as HTMLButtonElement;

  public createCredentialListElement(credential) {
    var container = document.createElement("div");

    var domainEl = document.createElement("span");
    domainEl.className = "domain-name";
    domainEl.textContent = credential.domain;
    container.appendChild(domainEl);

    var usernameEl = document.createElement("input");
    usernameEl.value = credential.username;
    usernameEl.disabled = true;
    container.appendChild(usernameEl);

    var passwordEl = document.createElement("input");
    passwordEl.type = "password";
    passwordEl.value = credential.password;
    passwordEl.disabled = true;
    container.appendChild(passwordEl);

    var revealButton = document.createElement("button");
    revealButton.className = "i carbon:view";
    revealButton.addEventListener("click", function () {
      if (passwordEl.type === "password") {
        passwordEl.type = "text";
        revealButton.classList.remove("carbon:view");
        revealButton.classList.add("carbon:view-off");
      } else {
        passwordEl.type = "password";
        revealButton.classList.add("carbon:view");
        revealButton.classList.remove("carbon:view-off");
      }
    });
    container.appendChild(revealButton);

    var deleteButton = document.createElement("button");
    deleteButton.className = "i carbon:trash-can";
    container.appendChild(deleteButton);

    deleteButton.addEventListener("click", function () {
      if (confirm(l("deletePassword").replace("%s", credential.domain))) {
        PasswordManagers.getConfiguredPasswordManager().then(function (
          manager
        ) {
          manager.deleteCredential(credential.domain, credential.username);
          container.remove();
        });
      }
    });

    return container;
  }

  public createNeverSaveDomainElement(domain) {
    var container = document.createElement("div");

    var domainEl = document.createElement("span");
    domainEl.className = "domain-name";
    domainEl.textContent = domain;
    container.appendChild(domainEl);

    var descriptionEl = document.createElement("span");
    descriptionEl.className = "description";
    descriptionEl.textContent = l("savedPasswordsNeverSavedLabel");
    container.appendChild(descriptionEl);

    var deleteButton = document.createElement("button");
    deleteButton.className = "i carbon:trash-can";
    container.appendChild(deleteButton);

    deleteButton.addEventListener("click", function () {
      settings.set(
        "passwordsNeverSaveDomains",
        settings.get("passwordsNeverSaveDomains").filter((d) => d !== domain)
      );
      container.remove();
    });

    return container;
  }

  public show() {
    PasswordManagers.getConfiguredPasswordManager().then((manager) => {
      if (!manager.getAllCredentials) {
        throw new Error("unsupported password manager");
      }

      manager.getAllCredentials().then((credentials) => {
        webviews.requestPlaceholder("passwordViewer");
        modalMode.toggle(true, {
          onDismiss: this.hide,
        });
        this.container.hidden = false;

        credentials.forEach((cred) => {
          this.listContainer.appendChild(
            this.createCredentialListElement(cred)
          );
        });

        const neverSaveDomains =
          settings.get("passwordsNeverSaveDomains") || [];

        neverSaveDomains.forEach((domain) => {
          this.listContainer.appendChild(
            this.createNeverSaveDomainElement(domain)
          );
        });

        this.emptyHeading.hidden =
          credentials.length + neverSaveDomains.length !== 0;
      });
    });
  }

  public hide() {
    webviews.hidePlaceholder("passwordViewer");
    modalMode.toggle(false);
    empty(this.listContainer);
    this.container.hidden = true;
  }

  constructor() {
    this.closeButton.addEventListener("click", this.hide);
    webviews.bindIPC("showCredentialList", () => {
      this.show();
    });
  }
}

export default new PasswordViewer();
