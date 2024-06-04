import * as t from "io-ts";

import { TaskEither, tryCatch } from "fp-ts/lib/TaskEither";

import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";

import {
  Installation,
  Notification,
  NotificationHubsClient,
  NotificationHubsMessageResponse,
  NotificationHubsResponse
} from "@azure/notification-hubs";

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
  message: Notification
): TaskEither<Error, NotificationHubsMessageResponse> =>
  tryCatch(
    () => notificationHubService.sendNotification(message),
    errs =>
      new Error(`Error while sending notification to NotificationHub | ${errs}`)
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
