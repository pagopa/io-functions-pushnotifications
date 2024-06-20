import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";
import * as t from "io-ts";
import { NotificationHubsClient } from "@azure/notification-hubs";
import { TelemetryClient } from "applicationinsights";
import { toString } from "../utils/conversions";

import { InstallationId } from "../generated/notifications/InstallationId";
import { Platform, PlatformEnum } from "../generated/notifications/Platform";

import {
  ActivityBody,
  ActivityResultSuccess,
  retryActivity
} from "../utils/durable/activities";
import { createOrUpdateInstallation } from "../utils/notification";
import { NotificationHubConfig } from "../utils/notificationhubServicePartition";

export type ActivityInput = t.TypeOf<typeof ActivityInput>;
export const ActivityInput = t.interface({
  installationId: InstallationId,
  notificationHubConfig: NotificationHubConfig,
  platform: Platform,
  pushChannel: t.string,
  tags: t.readonlyArray(t.string, "array of string")
});

export { ActivityResultSuccess } from "../utils/durable/activities";

export type ActivityBodyImpl = ActivityBody<
  ActivityInput,
  ActivityResultSuccess
>;

const getPlatformFromPlatformEnum = (
  platformEnum: PlatformEnum
): "apns" | "fcmv1" => (platformEnum === "apns" ? "apns" : "fcmv1");

export const getActivityBody = (
  buildNHClient: (nhConfig: NotificationHubConfig) => NotificationHubsClient,
  telemetryClient: TelemetryClient
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
): ActivityBodyImpl => ({ input, logger }) => {
  logger.info(`INSTALLATION_ID=${input.installationId}`);
  const nhClient = buildNHClient(input.notificationHubConfig);
  return pipe(
    createOrUpdateInstallation(
      nhClient,
      input.installationId,
      getPlatformFromPlatformEnum(input.platform),
      input.pushChannel,
      input.tags
    ),
    TE.bimap(
      e => {
        telemetryClient.trackEvent({
          name: "api.messages.notification.createOrUpdateInstallation.failure",
          properties: {
            installationId: input.installationId,
            isSuccess: "false",
            notificationHubName: input.notificationHubConfig.AZURE_NH_HUB_NAME,
            platform: input.platform,
            reason: e.message
          },
          tagOverrides: { samplingEnabled: "false" }
        });
        return retryActivity(logger, toString(e));
      },
      () => {
        telemetryClient.trackEvent({
          name: "api.messages.notification.createOrUpdateInstallation.success",
          properties: {
            installationId: input.installationId,
            isSuccess: "true",
            notificationHubName: input.notificationHubConfig.AZURE_NH_HUB_NAME,
            platform: input.platform
          },
          tagOverrides: { samplingEnabled: "false" }
        });
        return ActivityResultSuccess.encode({ kind: "SUCCESS" });
      }
    )
  );
};
