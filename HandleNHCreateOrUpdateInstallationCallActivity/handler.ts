import NotificationHubService = require("azure-sb/lib/notificationhubservice");
import { toString } from "fp-ts/lib/function";
import * as t from "io-ts";

import { InstallationId } from "../generated/notifications/InstallationId";
import { Platform } from "../generated/notifications/Platform";

import {
  ActivityBody,
  ActivityResultSuccess,
  retryActivity
} from "../utils/durable/activities";
import { createOrUpdateInstallation } from "../utils/notification";
import { NotificationHubConfig } from "../utils/notificationhubServicePartition";

// Activity input
export type CreateOrUpdateActivityInput = t.TypeOf<typeof ActivityInput>;
export const ActivityInput = t.interface({
  installationId: InstallationId,
  notificationHubConfig: NotificationHubConfig,
  platform: Platform,
  pushChannel: t.string,
  tags: t.readonlyArray(t.string, "array of string")
});

export { ActivityResultSuccess } from "../utils/durable/activities";

export type ActivityBodyImpl = ActivityBody<
  CreateOrUpdateActivityInput,
  ActivityResultSuccess
>;

export const getActivityBody = (
  buildNHService: (nhConfig: NotificationHubConfig) => NotificationHubService
): ActivityBodyImpl => ({ input, logger }) => {
  logger.info(`INSTALLATION_ID=${input.installationId}`);
  const nhService = buildNHService(input.notificationHubConfig);
  return createOrUpdateInstallation(
    nhService,
    input.installationId,
    input.platform,
    input.pushChannel,
    input.tags
  ).bimap(
    e => retryActivity(logger, `ERROR=${toString(e)}`),
    ActivityResultSuccess.encode
  );
};
