import * as t from "io-ts";
import * as TE from "fp-ts/lib/TaskEither";

import { TaskEither, tryCatch } from "fp-ts/lib/TaskEither";

import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";

import {
  createAppleNotification,
  AppleNotification,
  createXiaomiNotification,
  Installation,
  NotificationHubsClient,
  NotificationHubsMessageResponse,
  NotificationHubsResponse,
  XiaomiNotification,
  FcmV1Notification,
  createFcmV1Notification
} from "@azure/notification-hubs";
import { pipe } from "fp-ts/lib/function";
import { NotifyMessagePayload } from "../generated/notifications/NotifyMessagePayload";
import { InstallationId } from "../generated/notifications/InstallationId";

type Platform =
  | "apns"
  | "adm"
  | "baidu"
  | "browser"
  | "gcm"
  | "fcmv1"
  | "xiaomi"
  | "wns";

const getInstallationFromInstallationId = (
  nhService: NotificationHubsClient
) => (installationId: InstallationId): TE.TaskEither<Error, Installation> =>
  TE.tryCatch(
    () => nhService.getInstallation(installationId),
    // TODO: make this error more specific
    () => new Error("error while retrieving the installation")
  );

const getPlatformFromInstallation = (installation: Installation): Platform =>
  installation.platform;

// TODO: check if we need to use other platforms
const createNotification = (body: NotifyMessagePayload) => (
  platform: Platform
): TE.TaskEither<
  Error,
  AppleNotification | XiaomiNotification | FcmV1Notification
> => {
  const notificationParams = { body };
  switch (platform) {
    case "apns":
      return TE.of(createAppleNotification(notificationParams));
    case "xiaomi":
      return TE.of(createXiaomiNotification(notificationParams));
    case "gcm":
      return TE.of(
        createFcmV1Notification({
          body: { android: { data: { message: body.message } } }
        })
      );
    default:
      // TODO: make this more explicit
      return TE.left(new Error("Error invalid platform"));
  }
};

/**
 * Notification template.
 *
 * @see https://msdn.microsoft.com/en-us/library/azure/mt621153.aspx
 */
export const INotificationTemplate = t.interface({
  body: t.string
});

export type INotificationTemplate = t.TypeOf<typeof INotificationTemplate>;

/**
 * APNS apns-push-type available values
 *
 * @see https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server/sending_notification_requests_to_apns
 */
export enum APNSPushType {
  ALERT = "alert",
  BACKGROUND = "background",
  VOIP = "voip",
  COMPLICATION = "complication",
  FILEPROVIDER = "fileprovider",
  MDM = "mdm"
}

export const nhResultSuccess = t.interface({
  kind: t.literal("SUCCESS")
});

export type NHResultSuccess = t.TypeOf<typeof nhResultSuccess>;

export const notify = (
  notificationHubService: NotificationHubsClient,
  payload: NotifyMessagePayload,
  installationId: InstallationId
): TaskEither<Error, NotificationHubsMessageResponse> =>
  pipe(
    installationId,
    getInstallationFromInstallationId(notificationHubService),
    TE.map(getPlatformFromInstallation),
    TE.chain(createNotification(payload)),
    TE.chain(notification =>
      TE.tryCatch(
        () => notificationHubService.sendNotification(notification),
        errs =>
          new Error(
            `Error while sending notification to NotificationHub | ${errs}`
          )
      )
    )
  );

export const createOrUpdateInstallation = (
  notificationHubService: NotificationHubsClient,
  installation: Installation
): TaskEither<Error, NotificationHubsResponse> =>
  tryCatch(
    () => notificationHubService.createOrUpdateInstallation(installation),
    errs =>
      new Error(
        `Error while creating or updating installation on NotificationHub [${errs}]`
      )
  );

export const deleteInstallation = (
  notificationHubService: NotificationHubsClient,
  installationId: NonEmptyString
): TaskEither<Error, NotificationHubsResponse> =>
  tryCatch(
    () => notificationHubService.deleteInstallation(installationId),
    errs =>
      new Error(
        `Error while deleting installation on NotificationHub [${installationId}] [${errs}]`
      )
  );
