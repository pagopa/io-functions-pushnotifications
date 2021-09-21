/**
 * This file contains the CreatedMessageEventSenderMetadata and Notification models.
 */

import * as t from "io-ts";

import { pipe } from "fp-ts/lib/function";

import * as E from "fp-ts/lib/Either";
import * as O from "fp-ts/lib/Option";

import { TaskEither, tryCatch } from "fp-ts/lib/TaskEither";
import { either, Either, left } from "fp-ts/lib/Either";

import { NotificationHubService, Azure } from "azure-sb";
import {
  getKeepAliveAgentOptions,
  newHttpsAgent
} from "@pagopa/ts-commons/lib/agent";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";

import { Platform, PlatformEnum } from "../generated/notifications/Platform";
import { toString } from "./conversions";
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

/** Check if an Azure ServiceBus Dictionary is empty */
const dictionaryIsEmpty = (
  obj: Azure.ServiceBus.Dictionary<string | unknown>
): boolean => Object.keys(obj).length === 0;

/** Compose the error message coming from NH */
const composeNHErrorMessage = (
  err: Error,
  response: Azure.ServiceBus.Response
): string =>
  pipe(
    response,
    O.fromNullable,
    O.map(
      res =>
        !res.body || dictionaryIsEmpty(res.body)
          ? "No response body"
          : toString(res.body).replace(/\n/gim, " ") // avoid newlines
    ),
    O.map(innerMessage =>
      innerMessage
        ? `[error message: ${err.message}] [response: ${response.statusCode} - ${innerMessage}]`
        : `[error message: ${err.message}] [response: ${response.statusCode}]`
    ),
    O.getOrElse(() => `[error message: ${err.message}]`)
  );

/**
 * Handle the Azure Notification Hub callback and
 * return either an Error or a `NHResultSuccess`
 *
 * @param err The error message from Notification Hub, if any
 * @param response The response from Notification Hub
 * @returns either an Error or a success result
 */
const handleResponseOrError = (
  err: Error | null,
  response: Azure.ServiceBus.Response
): Either<Error, NHResultSuccess> =>
  err == null
    ? either.of(successNH())
    : left(new Error(composeNHErrorMessage(err, response)));

/**
 * Call `Notify Message` to Notification Hub
 *
 * @param notificationHubService The Notification Hub to call
 * @param installationId The `Installation Id` to notify
 * @param payload The message payload
 * @returns An `NHResultSuccess` or an `Error`
 */
export const notify = (
  notificationHubService: NotificationHubService,
  installationId: NonEmptyString,
  payload: NotifyPayload
): TaskEither<Error, NHResultSuccess> =>
  tryCatch(
    () =>
      new Promise<NHResultSuccess>((resolve, reject) =>
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
          (err, response) =>
            pipe(
              handleResponseOrError(err, response),
              E.mapLeft(reject),
              E.map(resolve)
            )
        )
      ),
    errs =>
      new Error(
        `Error while sending notification to NotificationHub [${installationId}] [${errs}]`
      )
  );

/**
 * Call `Create or Update Installation` to Notification Hub for an Installation Id
 *
 * @param notificationHubService The Notification Hub to call
 * @param installationId The `Installation Id` to create or update
 * @param platform The user's device platform (cgm or apns)
 * @param pushChannel The user's device notification token
 * @param tags An array of tags
 * @returns An `NHResultSuccess` or an `Error`
 */
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
    () =>
      new Promise<NHResultSuccess>((resolve, reject) =>
        notificationHubService.createOrUpdateInstallation(
          azureInstallationOptions,
          // eslint-disable-next-line sonarjs/no-identical-functions
          (err, response) =>
            pipe(
              handleResponseOrError(err, response),
              E.mapLeft(reject),
              E.map(resolve)
            )
        )
      ),
    errs =>
      new Error(
        `Error while creating or updating installation on NotificationHub [${installationId}] [${errs}]`
      )
  );
};

/**
 * Call `Delete Installation` to Notification Hub
 *
 * @param notificationHubService The Notification Hub to call
 * @param installationId The `Installation Id` to delete
 * @returns An `NHResultSuccess` or an `Error`
 */
export const deleteInstallation = (
  notificationHubService: NotificationHubService,
  installationId: NonEmptyString
): TaskEither<Error, NHResultSuccess> =>
  tryCatch(
    () =>
      new Promise<NHResultSuccess>((resolve, reject) =>
        notificationHubService.deleteInstallation(
          installationId,
          // eslint-disable-next-line sonarjs/no-identical-functions
          (err, response) =>
            pipe(
              handleResponseOrError(err, response),
              E.mapLeft(reject),
              E.map(resolve)
            )
        )
      ),
    errs =>
      new Error(
        `Error while deleting installation on NotificationHub [${installationId}] [${errs}]`
      )
  );
