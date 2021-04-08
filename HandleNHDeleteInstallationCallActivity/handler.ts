import * as t from "io-ts";

import { NonEmptyString } from "italia-ts-commons/lib/strings";

import {
  ActivityBody,
  ActivityResultSuccess,
  failure
} from "../utils/durable/activities";
import { deleteInstallation } from "../utils/notification";
import {
  buildNHService,
  NotificationHubConfig
} from "../utils/notificationhubServicePartition";

// Activity name for df
export const ActivityName = "HandleNHDeleteInstallationCallActivity";

// Activity input
export type ActivityInput = t.TypeOf<typeof ActivityInput>;
export const ActivityInput = t.interface({
  installationId: NonEmptyString,
  notificationHubConfig: NotificationHubConfig
});

export { ActivityResultSuccess } from "../utils/durable/activities";

export type ActivityBodyImpl = ActivityBody<
  ActivityInput,
  ActivityResultSuccess
>;

export const activityBody: ActivityBodyImpl = ({ input, logger }) => {
  logger.info(`INSTALLATION_ID=${input.installationId}`);
  const nhService = buildNHService(input.notificationHubConfig);
  return deleteInstallation(nhService, input.installationId).bimap(
    failure(logger), // do not trigger a retry as delete may fail in case of 404
    ActivityResultSuccess.encode
  );
};
