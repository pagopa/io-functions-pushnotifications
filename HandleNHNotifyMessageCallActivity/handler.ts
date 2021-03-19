import { identity, toString } from "fp-ts/lib/function";
import { fromEither, taskEither } from "fp-ts/lib/TaskEither";
import * as t from "io-ts";

import { Context } from "@azure/functions";

import { readableReport } from "italia-ts-commons/lib/reporters";

import {
  ActivityResult,
  ActivityResultSuccess,
  failActivity,
  retryActivity,
  success
} from "../utils/activity";
import { initTelemetryClient } from "../utils/appinsights";
import { notify } from "../utils/notification";

import { NotifyMessage } from "../generated/notifications/NotifyMessage";
import {
  buildNHService,
  NotificationHubConfig
} from "../utils/notificationhubServicePartition";

/**
 * Activity Name
 */
export const ActivityName = "HandleNHNotifyMessageCallActivity";

// Activity input
export const ActivityInput = t.interface({
  message: NotifyMessage,
  notificationHubConfig: NotificationHubConfig
});

export type ActivityInput = t.TypeOf<typeof ActivityInput>;

/**
 * For each Notification Hub Message of type "Delete" calls related Notification Hub service
 */
export const getCallNHNotifyMessageActivityHandler = (
  telemetryClient: ReturnType<typeof initTelemetryClient>,
  logPrefix = "NHNotifyCallServiceActivity"
) => async (context: Context, input: unknown) => {
  const failure = failActivity(context, logPrefix);
  return fromEither(ActivityInput.decode(input))
    .mapLeft(errs =>
      failure("Error decoding activity input", readableReport(errs))
    )
    .chain<ActivityResultSuccess>(({ message, notificationHubConfig }) => {
      context.log.info(
        `${logPrefix}|${message.kind}|INSTALLATION_ID=${message.installationId}`
      );

      const nhService = buildNHService(notificationHubConfig);

      return notify(nhService, message.installationId, message.payload)
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
    })
    .fold<ActivityResult>(identity, success)
    .run();
};
