import * as t from "io-ts";

import { Context } from "@azure/functions";
import { identity, toString } from "fp-ts/lib/function";

import { readableReport } from "italia-ts-commons/lib/reporters";

import { fromEither, taskEither } from "fp-ts/lib/TaskEither";
import { KindEnum as CreateOrUpdateKind } from "../generated/notifications/CreateOrUpdateInstallationMessage";
import { KindEnum as DeleteKind } from "../generated/notifications/DeleteInstallationMessage";
import { KindEnum as NotifyKind } from "../generated/notifications/NotifyMessage";
import { NotificationMessage } from "../HandleNHNotificationCall";
import {
  createOrUpdateInstallation,
  deleteInstallation,
  notify
} from "../utils/notification";

import {
  ActivityResult,
  ActivityResultSuccess,
  failActivity,
  retryActivity,
  success
} from "../utils/activity";
import { initTelemetryClient } from "../utils/appinsights";

// Activity input
export const ActivityInput = t.interface({
  message: NotificationMessage
});

export type ActivityInput = t.TypeOf<typeof ActivityInput>;

const assertNever = (x: never): never => {
  throw new Error(`Unexpected object: ${toString(x)}`);
};

const telemetryClient = initTelemetryClient();

/**
 * For each Notification Hub Message calls related Notification Hub service
 */
export const getCallNHServiceActivityHandler = (
  logPrefix = "NHCallServiceActivity"
) => async (context: Context, input: unknown) => {
  const failure = failActivity(context, logPrefix);
  return fromEither(ActivityInput.decode(input))
    .mapLeft(errs =>
      failure("Error decoding activity input", readableReport(errs))
    )
    .chain<ActivityResultSuccess>(({ message }) => {
      context.log.info(
        `${logPrefix}|${message.kind}|INSTALLATION_ID=${message.installationId}`
      );
      switch (message.kind) {
        case CreateOrUpdateKind.CreateOrUpdateInstallation:
          return createOrUpdateInstallation(
            message.installationId,
            message.platform,
            message.pushChannel,
            message.tags
          ).mapLeft(e =>
            retryActivity(context, `${logPrefix}|ERROR=${toString(e)}`)
          );
        case NotifyKind.Notify:
          return notify(message.installationId, message.payload)
            .mapLeft(e =>
              retryActivity(context, `${logPrefix}|ERROR=${toString(e)}`)
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
          return deleteInstallation(message.installationId).mapLeft(e => {
            // do not trigger a retry as delete may fail in case of 404
            context.log.error(`${logPrefix}|ERROR=${toString(e)}`);
            return failure(e.message);
          });
        default:
          assertNever(message);
      }
    })
    .fold<ActivityResult>(identity, success)
    .run();
};