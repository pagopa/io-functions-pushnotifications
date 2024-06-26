import * as t from "io-ts";
import * as TE from "fp-ts/lib/TaskEither";

import { TaskEither, tryCatch } from "fp-ts/lib/TaskEither";

import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";

import {
  createTemplateNotification,
  Installation,
  NotificationHubsClient,
  NotificationHubsResponse,
  TemplateNotification
} from "@azure/notification-hubs";
import { pipe } from "fp-ts/lib/function";
import { TelemetryClient } from "applicationinsights";
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

export const NHClientError = t.type({
  statusCode: t.literal(404)
});

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

const createNotification = (
  body: NotifyMessagePayload
): TE.TaskEither<never, TemplateNotification> =>
  TE.of(
    createTemplateNotification({
      body: {
        message: body.message,
        message_id: body.message_id,
        title: body.title
      }
    })
  );

export const nhResultSuccess = t.interface({
  kind: t.literal("SUCCESS")
});

export type NHResultSuccess = t.TypeOf<typeof nhResultSuccess>;

export const toTagExpression = (fiscalCodeHash: NonEmptyString): string =>
  `$InstallationId:{${fiscalCodeHash}}`;

export const notify = (
  notificationHubService: NotificationHubsClient,
  payload: NotifyMessagePayload,
  installationId: InstallationId,
  telemetryClient: TelemetryClient
): TaskEither<Error, void> =>
  pipe(
    createNotification(payload),
    TE.chain(notification =>
      TE.tryCatch(
        () =>
          notificationHubService.sendNotification(notification, {
            tagExpression: toTagExpression(installationId)
          }),
        errs =>
          new Error(
            `Error while sending notification to NotificationHub | ${errs}`
          )
      )
    ),
    TE.map(response => {
      telemetryClient.trackEvent({
        name: "api.messages.notification.push.nh.response",
        properties: {
          installationId,
          messageId: payload.message_id,
          state: response.state,
          successCount: response.successCount
        },
        tagOverrides: { samplingEnabled: "false" }
      });
    })
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
