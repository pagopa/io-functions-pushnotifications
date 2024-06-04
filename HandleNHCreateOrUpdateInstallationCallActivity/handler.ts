import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";
import * as t from "io-ts";
import {
  createAppleInstallation,
  NotificationHubsClient
} from "@azure/notification-hubs";
import { toString } from "../utils/conversions";

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
  buildNHService: (nhConfig: NotificationHubConfig) => NotificationHubsClient
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
): ActivityBodyImpl => ({ input, logger }) => {
  logger.info(`INSTALLATION_ID=${input.installationId}`);
  const nhService = buildNHService(input.notificationHubConfig);
  return pipe(
    createOrUpdateInstallation(
      nhService,
      createAppleInstallation({
        installationId: input.installationId,
        pushChannel: input.pushChannel,
        // FIX: this map is here as a workaround to the typescript error due to
        // the readonly property
        tags: input.tags.map(x => x)
      })
    ),
    TE.bimap(
      e => retryActivity(logger, toString(e)),
      installation =>
        ActivityResultSuccess.encode({ kind: "SUCCESS", ...installation })
    )
  );
};
