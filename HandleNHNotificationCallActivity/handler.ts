import * as t from "io-ts";

import { Context } from "@azure/functions";
import { identity, toString } from "fp-ts/lib/function";
import { fromEither, taskEither } from "fp-ts/lib/TaskEither";

import { readableReport } from "italia-ts-commons/lib/reporters";

import { KindEnum as CreateOrUpdateKind } from "../generated/notifications/CreateOrUpdateInstallationMessage";
import { KindEnum as DeleteKind } from "../generated/notifications/DeleteInstallationMessage";
import { KindEnum as NotifyKind } from "../generated/notifications/NotifyMessage";
import { NotificationMessage } from "../HandleNHNotificationCall/handler";
import {
  createOrUpdateInstallation,
  deleteInstallation,
  notify
} from "../utils/notification";

import { initTelemetryClient } from "../utils/appinsights";
import {
  ActivityResult,
  ActivityResultSuccess,
  createLogger,
  failActivity,
  retryActivity
} from "../utils/durable/activities";
import {
  buildNHService,
  NotificationHubConfig
} from "../utils/notificationhubServicePartition";

// Activity input
export const HandleNHNotificationCallActivityInput = t.interface({
  message: NotificationMessage,
  notificationHubConfig: NotificationHubConfig
});

export type HandleNHNotificationCallActivityInput = t.TypeOf<
  typeof HandleNHNotificationCallActivityInput
>;

const assertNever = (x: never): never => {
  throw new Error(`Unexpected object: ${toString(x)}`);
};

/**
 * For each Notification Hub Message calls related Notification Hub service
 */
export const getCallNHServiceActivityHandler = (
  telemetryClient: ReturnType<typeof initTelemetryClient>,
  logPrefix = "NHCallServiceActivity"
) => async (context: Context, input: unknown) => {
  const logger = createLogger(context, logPrefix);
  const failure = failActivity(logger);
  return fromEither(HandleNHNotificationCallActivityInput.decode(input))
    .mapLeft(errs =>
      failure("Error decoding activity input", readableReport(errs))
    )
    .chain<ActivityResultSuccess>(({ message, notificationHubConfig }) => {
      context.log.info(
        `${logPrefix}|${message.kind}|INSTALLATION_ID=${message.installationId}`
      );

      const nhService = buildNHService(notificationHubConfig);

      switch (message.kind) {
        case CreateOrUpdateKind.CreateOrUpdateInstallation:
          return createOrUpdateInstallation(
            nhService,
            message.installationId,
            message.platform,
            message.pushChannel,
            message.tags
          ).mapLeft(e => retryActivity(logger, `ERROR=${toString(e)}`));
        case NotifyKind.Notify:
          return notify(nhService, message.installationId, message.payload)
            .mapLeft(e =>
              retryActivity(logger, `${logPrefix}|ERROR=${toString(e)}`)
            )
            .chainFirst(
              taskEither.of(
                telemetryClient.trackEvent({
                  name: "api.messages.notification.push.sent",
                  properties: {
                    isSuccess: "true",
                    messageId: message.payload.message_id
                  },
                  tagOverrides: { samplingEnabled: "false" }
                })
              )
            );
        case DeleteKind.DeleteInstallation:
          return deleteInstallation(nhService, message.installationId).mapLeft(
            e => {
              // do not trigger a retry as delete may fail in case of 404
              context.log.error(`${logPrefix}|ERROR=${toString(e)}`);
              return failure(e.message);
            }
          );
        default:
          assertNever(message);
      }
    })
    .fold<ActivityResult>(identity, identity)
    .run();
};
