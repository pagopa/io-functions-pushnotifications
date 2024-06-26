import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";
import * as t from "io-ts";

import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { NotificationHubsClient } from "@azure/notification-hubs";
import { TelemetryClient } from "applicationinsights";
import { toString } from "../utils/conversions";

import {
  ActivityBody,
  ActivityResultSuccess,
  failActivity
} from "../utils/durable/activities";
import { deleteInstallation } from "../utils/notification";
import { NotificationHubConfig } from "../utils/notificationhubServicePartition";

// Activity name for df
export const ActivityName = "HandleNHDeleteInstallationCallActivity";

// Activity input
export type ActivityInput = t.TypeOf<typeof ActivityInput>;
export const ActivityInput = t.interface({
  installationId: NonEmptyString,
  notificationHubConfig: NotificationHubConfig
});

// Activity Result
export { ActivityResultSuccess } from "../utils/durable/activities";

/**
 * For each Notification Hub Message of type "Delete" calls related Notification Hub service
 */

export const getActivityBody = (
  buildNHClient: (nhConfig: NotificationHubConfig) => NotificationHubsClient,
  telemetryClient: TelemetryClient
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
): ActivityBody<ActivityInput, ActivityResultSuccess> => ({
  input,
  logger
}) => {
  logger.info(`INSTALLATION_ID=${input.installationId}`);
  const nhClient = buildNHClient(input.notificationHubConfig);

  return pipe(
    deleteInstallation(nhClient, input.installationId),
    TE.bimap(
      e => {
        telemetryClient.trackEvent({
          name: "api.messages.notification.deleteInstallation.failure",
          properties: {
            installationId: input.installationId,
            isSuccess: "false",
            notificationHubName: input.notificationHubConfig.AZURE_NH_HUB_NAME,
            reason: e.message
          },
          tagOverrides: { samplingEnabled: "false" }
        });
        return failActivity(logger)(`ERROR=${toString(e)}`);
      },
      response => {
        telemetryClient.trackEvent({
          name: "api.messages.notification.deleteInstallation.success",
          properties: {
            installationId: input.installationId,
            isSuccess: "true",
            notificationHubName: input.notificationHubConfig.AZURE_NH_HUB_NAME
          },
          tagOverrides: { samplingEnabled: "false" }
        });
        return ActivityResultSuccess.encode({ kind: "SUCCESS", ...response });
      }
    )
  );
};
