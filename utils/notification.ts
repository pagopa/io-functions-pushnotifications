import * as t from "io-ts";
import * as TE from "fp-ts/lib/TaskEither";

import { TaskEither, tryCatch } from "fp-ts/lib/TaskEither";

import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";

import {
  AppleInstallation,
  AppleNotification,
  createAppleNotification,
  createFcmLegacyNotification,
  createFcmV1Notification,
  FcmLegacyNotification,
  FcmV1Installation,
  FcmV1Notification,
  Installation,
  NotificationHubsClient,
  NotificationHubsMessageResponse,
  NotificationHubsResponse
} from "@azure/notification-hubs";
import { pipe } from "fp-ts/lib/function";
import { NotifyMessagePayload } from "../generated/notifications/NotifyMessagePayload";
import { InstallationId } from "../generated/notifications/InstallationId";

/**
 * A template suitable for Apple's APNs.
 *
 * @see https://developer.apple.com/library/content/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/CreatingtheNotificationPayload.html
 */
const APNSTemplate =
  '{"aps": {"alert": {"title": "$(title)", "body": "$(message)"}}, "message_id": "$(message_id)"}';

/**
 * Build a template suitable for Google's FCMV1.
 *
 * @see https://developers.google.com/cloud-messaging/concept-options
 */
const FCMV1Template =
  '{"message": {"notification": {"title": "$(title)", "body": "$(message)"}, "android": {"data": {"message_id": "$(message_id)"}, "notification": {"icon": "ic_notification"}}}}';

// when the createOrUpdateInstallation is called we only support apns and gcm
export const Platform = t.union([
  t.literal("apns"),
  t.literal("fcmv1"),
  t.literal("gcm")
]);
export type Platform = t.TypeOf<typeof Platform>;

const validateInstallation = (
  installation: Installation
): TE.TaskEither<Error, AppleInstallation | FcmV1Installation> =>
  installation.platform === "fcmv1"
    ? TE.of(installation)
    : installation.platform === "apns"
    ? TE.of(installation)
    : TE.left(new Error("Invalid installation"));

export const getInstallationFromInstallationId = (
  nhClient: NotificationHubsClient
) => (
  installationId: InstallationId
): TE.TaskEither<Error, AppleInstallation | FcmV1Installation> =>
  pipe(
    TE.tryCatch(
      () => nhClient.getInstallation(installationId),
      () => new Error("error while retrieving the installation")
    ),
    TE.chain(validateInstallation)
  );

export const getPlatformFromInstallation = (
  installation: Installation
): TE.TaskEither<Error, Platform> =>
  pipe(
    Platform.decode(installation.platform),
    TE.fromEither,
    TE.mapLeft(() => new Error("Invalid platform"))
  );

/**
 * Notification template.
 *
 * @see https://msdn.microsoft.com/en-us/library/azure/mt621153.aspx
 */
export const INotificationTemplate = t.interface({
  body: t.string
});

export type INotificationTemplate = t.TypeOf<typeof INotificationTemplate>;

const createNotification = (body: NotifyMessagePayload) => (
  platform: Platform
): TE.TaskEither<
  Error,
  AppleNotification | FcmV1Notification | FcmLegacyNotification
> => {
  switch (platform) {
    case "apns":
      return TE.of(
        createAppleNotification({
          body: {
            aps: { alert: { body: body.message, title: body.title } },
            message_id: body.message_id
          },
          headers: {
            ["apns-priority"]: "10",
            ["apns-push-type"]: APNSPushType.ALERT
          }
        })
      );
    case "gcm":
      return TE.of(
        createFcmLegacyNotification({
          body: {
            data: {
              largeIcon: "ic_notification",
              message: body.message,
              message_id: body.message_id,
              smallIcon: "ic_notification",
              title: body.title
            }
          }
        })
      );
    case "fcmv1":
      return TE.of(
        createFcmV1Notification({
          body: {
            android: {
              data: { message_id: body.message_id },
              notification: {
                icon: "ic_notification"
              }
            },
            notification: {
              body: body.message,
              title: body.title
            }
          }
        })
      );
    default:
      return TE.left(new Error("Error invalid platform"));
  }
};

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
    TE.chain(getPlatformFromInstallation),
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
  notificationHubClient: NotificationHubsClient,
  installationId: NonEmptyString,
  platform: Platform,
  pushChannel: string,
  tags: ReadonlyArray<string>
): TE.TaskEither<Error, NotificationHubsResponse> =>
  TE.tryCatch(
    () =>
      notificationHubClient.createOrUpdateInstallation({
        installationId,
        platform,
        pushChannel,
        templates: {
          template: {
            body: platform === "apns" ? APNSTemplate : FCMV1Template,
            headers:
              platform === "apns"
                ? {
                    ["apns-priority"]: "10",
                    ["apns-push-type"]: APNSPushType.ALERT
                  }
                : {},
            tags: [...tags]
          }
        }
      }),
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
