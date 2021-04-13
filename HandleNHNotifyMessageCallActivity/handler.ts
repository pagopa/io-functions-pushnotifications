import { toString } from "fp-ts/lib/function";
import { taskEither } from "fp-ts/lib/TaskEither";
import * as t from "io-ts";

import { TelemetryClient } from "applicationinsights";
import { NotificationHubService } from "azure-sb";

import {
  ActivityBody,
  ActivityResultSuccess,
  retryActivity
} from "../utils/durable/activities";
import { notify } from "../utils/notification";

import { NotifyMessage } from "../generated/notifications/NotifyMessage";
import { NotificationHubConfig } from "../utils/notificationhubServicePartition";

// message: t.string,
// message_id: t.string,
// title: t.string

// Activity input
export const ActivityInput = t.interface({
  message: NotifyMessage,
  notificationHubConfig: NotificationHubConfig
});

export type ActivityInput = t.TypeOf<typeof ActivityInput>;

// Activity Result
export { ActivityResultSuccess } from "../utils/durable/activities";

/**
 * For each Notification Hub Message of type "Delete" calls related Notification Hub service
 */

export const getActivityBody = (
  telemetryClient: TelemetryClient,
  buildNHService: (nhConfig: NotificationHubConfig) => NotificationHubService
): ActivityBody<ActivityInput, ActivityResultSuccess> => ({
  input,
  logger
}) => {
  logger.info(`INSTALLATION_ID=${input.message.installationId}`);
  const nhService = buildNHService(input.notificationHubConfig);
  return notify(nhService, input.message.installationId, input.message.payload)
    .bimap(
      e => retryActivity(logger, `ERROR=${toString(e)}`),
      ActivityResultSuccess.encode
    )
    .chainFirst(
      taskEither.of(
        telemetryClient.trackEvent({
          name: "api.messages.notification.push.sent",
          properties: {
            isSuccess: "true",
            messageId: input.message.payload.message_id
          },
          tagOverrides: { samplingEnabled: "false" }
        })
      )
    );
};
