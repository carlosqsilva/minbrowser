import {
  app,
  session,
  ipcMain as ipc,
} from "electron";
import type {
  WebContents,
  PermissionCheckHandlerHandlerDetails,
  PermissionRequestHandlerHandlerDetails
} from "electron"

import { getViewIDFromWebContents } from "./viewManager";
import { getMainWindow, sendIPCToWindow } from "./window";

interface Permission {
  permissionId: number;
  tabId?: string;
  contents: WebContents;
  origin: string;
  permission: string;
  details: any;
  granted?: boolean;
  callback?: ((permissionGranted: boolean) => void) | undefined;
}

let pendingPermissions: Permission[] = [];
let grantedPermissions: Permission[] = [];
let nextPermissionId = 1;

/*
All permission requests are given to the renderer on each change,
it will figure out what updates to make
*/
function sendPermissionsToRenderer() {
  // remove properties that can't be serialized over IPC
  sendIPCToWindow(
    "updatePermissions",
    pendingPermissions.concat(grantedPermissions).map((p) => {
      return {
        permissionId: p.permissionId,
        tabId: p.tabId,
        origin: p.origin,
        permission: p.permission,
        details: p.details,
        granted: p.granted,
      };
    })
  );
}

function removePermissionsForContents(contents) {
  pendingPermissions = pendingPermissions.filter(
    (perm) => perm.contents !== contents
  );
  grantedPermissions = grantedPermissions.filter(
    (perm) => perm.contents !== contents
  );

  sendPermissionsToRenderer();
}

type RequestDetails = Partial<
  PermissionRequestHandlerHandlerDetails & PermissionCheckHandlerHandlerDetails
>;

/*
Was permission already granted for this origin?
*/
function isPermissionGrantedForOrigin(
  requestOrigin: string,
  requestPermission: string,
  requestDetails: RequestDetails
) {
  for (const grantedPermission of grantedPermissions) {
    if (requestOrigin === grantedPermission.origin) {
      if (
        requestPermission === "notifications" &&
        grantedPermission.permission === "notifications"
      ) {
        return true;
      }

      if (
        requestPermission === "media" &&
        grantedPermission.permission === "media"
      ) {
        // type 1: from permissionCheckHandler
        // request has a single media type
        if (
          requestDetails.mediaType &&
          grantedPermission.details.mediaTypes.includes(
            requestDetails.mediaType
          )
        ) {
          return true;
        }
        // type 2: from a permissionRequestHandler
        // request has multiple media types
        // TODO existing granted permissions should be merged together (i.e. if there is an existing permission for audio, and another for video, a new request for audio+video should be approved, but it currently won't be)
        if (
          requestDetails.mediaTypes &&
          requestDetails.mediaTypes.every((type) =>
            grantedPermission.details.mediaTypes.includes(type)
          )
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

/*
Is there already a pending request of the given type for this origin?
 */
function hasPendingRequestForOrigin(
  requestOrigin: string,
  permission: string,
  details
) {
  for (const pendingPermission of pendingPermissions) {
    if (
      requestOrigin === pendingPermission.origin &&
      permission === pendingPermission.permission
    ) {
      return true;
    }
  }

  return false;
}

function pagePermissionRequestHandler(
  webContents: WebContents,
  permission: string,
  callback: (granted: boolean) => void,
  details
) {
  if (!details.isMainFrame) {
    // not supported for now to simplify the UI
    callback(false);
    return;
  }

  if (!details.requestingUrl) {
    callback(false);
    return;
  }

  if (
    permission === "fullscreen" ||
    permission === "clipboard-sanitized-write"
  ) {
    callback(true);
    return;
  }

  let requestOrigin;
  try {
    requestOrigin = new URL(details.requestingUrl).hostname;
  } catch (e) {
    // invalid URL
    console.warn(e, details.requestingUrl);
    callback(false);
    return;
  }

  /*
  Geolocation requires a Google API key (https://www.electronjs.org/docs/api/environment-variables#google_api_key), so it is disabled.
  Other permissions aren't supported for now to simplify the UI
  */
  if (["media", "notifications"].includes(permission)) {
    /*
    If permission was previously granted for this origin in a different tab, new requests should be allowed
    */
    if (isPermissionGrantedForOrigin(requestOrigin, permission, details)) {
      callback(true);

      if (
        !grantedPermissions.some(
          (grant) =>
            grant.contents === webContents && grant.permission === permission
        )
      ) {
        grantedPermissions.push({
          permissionId: nextPermissionId,
          tabId: getViewIDFromWebContents(webContents),
          contents: webContents,
          origin: requestOrigin,
          permission: permission,
          details: details,
          granted: true,
        });

        sendPermissionsToRenderer();
        nextPermissionId++;
      }
    } else if (
      permission === "notifications" &&
      hasPendingRequestForOrigin(requestOrigin, permission, details)
    ) {
      /*
      Sites sometimes make a new request for each notification, which can generate multiple requests if the first one wasn't approved.
      TODO this isn't entirely correct (some requests will be rejected when they should be pending) - correct solution is to show a single button to approve all requests in the UI.
      */
      callback(false);
    } else {
      pendingPermissions.push({
        permissionId: nextPermissionId,
        tabId: getViewIDFromWebContents(webContents),
        contents: webContents,
        origin: requestOrigin,
        permission: permission,
        details: details,
        callback: callback,
      });

      sendPermissionsToRenderer();
      nextPermissionId++;
    }

    /*
    Once this view is closed or navigated to a new page, these permissions should be revoked
    */
    webContents.on(
      "did-start-navigation",
      (e, url, isInPlace, isMainFrame, frameProcessId, frameRoutingId) => {
        if (isMainFrame && !isInPlace) {
          removePermissionsForContents(webContents);
        }
      }
    );
    webContents.once("destroyed", () => {
      // check whether the app is shutting down to avoid an electron crash (TODO remove this)
      if (getMainWindow()) {
        removePermissionsForContents(webContents);
      }
    });
  } else {
    callback(false);
  }
}

function pagePermissionCheckHandler(
  webContents,
  permission: string,
  requestingOrigin: string,
  details: PermissionCheckHandlerHandlerDetails
) {
  if (!details.isMainFrame && requestingOrigin !== details.embeddingOrigin) {
    return false;
  }

  if (permission === "clipboard-sanitized-write") {
    return true;
  }

  let requestHostname: string;

  try {
    requestHostname = new URL(requestingOrigin).hostname;
  } catch (e) {
    // invalid URL
    console.warn(e, requestingOrigin);
    return false;
  }

  return isPermissionGrantedForOrigin(requestHostname, permission, details);
}

app.once("ready", () => {
  session.defaultSession.setPermissionRequestHandler(
    pagePermissionRequestHandler
  );
  session.defaultSession.setPermissionCheckHandler(pagePermissionCheckHandler);
});

app.on("session-created", (session) => {
  session.setPermissionRequestHandler(pagePermissionRequestHandler);
  session.setPermissionCheckHandler(pagePermissionCheckHandler);
});

ipc.on("permissionGranted", (e, permissionId: number) => {
  for (var i = 0; i < pendingPermissions.length; i++) {
    if (permissionId && pendingPermissions[i].permissionId === permissionId) {
      pendingPermissions[i].granted = true;
      pendingPermissions[i]?.callback?.(true);
      grantedPermissions.push(pendingPermissions[i]);
      pendingPermissions.splice(i, 1);

      sendPermissionsToRenderer();
      break;
    }
  }
});
