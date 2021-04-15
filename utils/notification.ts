/**
 * This file contains the CreatedMessageEventSenderMetadata and Notification models.
 */

import * as t from "io-ts";
import { NonEmptyString } from "italia-ts-commons/lib/strings";

import { NotificationHubService } from "azure-sb";
import { TaskEither, tryCatch } from "fp-ts/lib/TaskEither";
import {
  getKeepAliveAgentOptions,
  newHttpsAgent
} from "italia-ts-commons/lib/agent";
import { Platform, PlatformEnum } from "../generated/backend/Platform";

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

const httpsAgent = newHttpsAgent(getKeepAliveAgentOptions(process.env));

// Monkey patch azure-sb package in order to use agentkeepalive
// when calling the Notification Hub API.
// @FIXME: remove this part and upgrade to @azure/notification-hubs
// once this goes upstream: https://github.com/Azure/azure-sdk-for-js/pull/11977
export class ExtendedNotificationHubService extends NotificationHubService {
  constructor(hubName: string, endpointOrConnectionString: string) {
    super(hubName, endpointOrConnectionString, "", "");
  }

  public _buildRequestOptions(
    webResource: unknown,
    body: unknown,
    options: unknown,
    // eslint-disable-next-line @typescript-eslint/ban-types
    cb: Function
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patchedCallback = (err: any, cbOptions: any): any => {
      cb(err, {
        ...cbOptions,
        agent: httpsAgent
      });
    };
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore -- although _buildRequestOptions is not defined in the Azure type NotificationHubService, we need to hack its internals to use keepalive feature. Compiling in strict mode would fail, so we prefer TS to just ignore this line
    // eslint-disable-next-line no-underscore-dangle
    return super._buildRequestOptions(
      webResource,
      body,
      options,
      patchedCallback
    );
  }
}

/**
 * A template suitable for Apple's APNs.
 *
 * @see https://developer.apple.com/library/content/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/CreatingtheNotificationPayload.html
 */
const APNSTemplate: INotificationTemplate = {
  body:
    '{"aps": {"alert": {"title": "$(title)", "body": "$(message)"}}, "message_id": "$(message_id)"}'
};

/**
 * Build a template suitable for Google's GCM.
 *
 * @see https://developers.google.com/cloud-messaging/concept-options
 */
const GCMTemplate: INotificationTemplate = {
  body:
    '{"data": {"title": "$(title)", "message": "$(message)", "message_id": "$(message_id)", "smallIcon": "ic_notification", "largeIcon": "ic_notification"}}'
};

// send the push notification only to the last
// device that set the installationId
// see https://docs.microsoft.com/en-us/azure/notification-hubs/notification-hubs-push-notification-registration-management#installations
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const toNotificationTag = (fiscalCodeHash: NonEmptyString): any =>
  `$InstallationId:{${fiscalCodeHash}}`;

const createOrUpdateInstallationOptions = t.interface({
  installationId: t.string,
  platform: t.keyof({
    adm: null,
    apns: null,
    gcm: null,
    mpns: null,
    wns: null
  }),
  pushChannel: t.string,
  tags: t.array(t.string),
  templates: t.interface({
    template: INotificationTemplate
  })
});

type CreateOrUpdateInstallationOptions = t.TypeOf<
  typeof createOrUpdateInstallationOptions
>;

const notifyPayload = t.interface({
  message: t.string,
  message_id: t.string,
  title: t.string
});

type NotifyPayload = t.TypeOf<typeof notifyPayload>;
// NH result
export const nhResultSuccess = t.interface({
  kind: t.literal("SUCCESS")
});

export type NHResultSuccess = t.TypeOf<typeof nhResultSuccess>;

const successNH = (): NHResultSuccess =>
  nhResultSuccess.encode({
    kind: "SUCCESS"
  });

/* eslint-disable arrow-body-style */
export const notify = (
  notificationHubService: NotificationHubService,
  installationId: NonEmptyString,
  payload: NotifyPayload
): TaskEither<Error, NHResultSuccess> => {
  return tryCatch(
    () => {
      return new Promise<NHResultSuccess>((resolve, reject) =>
        notificationHubService.send(
          toNotificationTag(installationId),
          payload,
          {
            // Add required headers for APNS notification to iOS 13
            // https://azure.microsoft.com/en-us/updates/azure-notification-hubs-updates-ios13/
            headers: {
              ["apns-priority"]: 10,
              ["apns-push-type"]: APNSPushType.ALERT
            }
          },
          (error, _) =>
            error == null
              ? resolve(successNH())
              : reject(
                  `Error while sending notification to NotificationHub|${error.message}`
                )
        )
      );
    },
    errs =>
      new Error(`Error while sending notification to NotificationHub|${errs}`)
  );
};

export const createOrUpdateInstallation = (
  notificationHubService: NotificationHubService,
  installationId: NonEmptyString,
  platform: Platform,
  pushChannel: string,
  tags: ReadonlyArray<string>
): TaskEither<Error, NHResultSuccess> => {
  const azureInstallationOptions: CreateOrUpdateInstallationOptions = {
    // When a single active session per user is allowed, the installation that must be created or updated
    // will have an unique installationId referred to that user.
    // Otherwise the installationId provided by the client will be used.
    installationId,
    platform,
    pushChannel,
    tags: [...tags],
    templates: {
      template: platform === PlatformEnum.apns ? APNSTemplate : GCMTemplate
    }
  };

  return tryCatch(
    () => {
      return new Promise<NHResultSuccess>((resolve, reject) =>
        notificationHubService.createOrUpdateInstallation(
          azureInstallationOptions,
          (err, _) =>
            err == null
              ? resolve(successNH())
              : reject(
                  `Error while creating or updating installation on NotificationHub [
                    ${installationId}] [${err.message}]`
                )
        )
      );
    },
    errs =>
      new Error(
        `Error while creating or updating installation on NotificationHub [${installationId}] [${errs}]`
      )
  );
};

export const deleteInstallation = (
  notificationHubService: NotificationHubService,
  installationId: NonEmptyString
): TaskEither<Error, NHResultSuccess> => {
  return tryCatch(
    () => {
      return new Promise<NHResultSuccess>((resolve, reject) =>
        notificationHubService.deleteInstallation(installationId, (e, _) =>
          e == null
            ? resolve(successNH())
            : reject(
                `Error while deleting installation on NotificationHub [${installationId}] [${e.message}]`
              )
        )
      );
    },
    errs =>
      new Error(
        `Error while deleting installation on NotificationHub [${installationId}] [${errs}]`
      )
  );
};
