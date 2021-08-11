import NotificationHubService = require("azure-sb/lib/notificationhubservice");
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";
import { toString } from "../utils/conversions";
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

export const getActivityBody = (
  buildNHService: (nhConfig: NotificationHubConfig) => NotificationHubService
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
): ActivityBodyImpl => ({ input, logger }) => {
  logger.info(`INSTALLATION_ID=${input.installationId}`);
  const nhService = buildNHService(input.notificationHubConfig);
  return pipe(
    createOrUpdateInstallation(
      nhService,
      input.installationId,
      input.platform,
      input.pushChannel,
      input.tags
    ),
    TE.bimap(
      e => retryActivity(logger, toString(e)),
      ActivityResultSuccess.encode
    )
  );
};
