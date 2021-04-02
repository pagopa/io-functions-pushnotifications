import { identity, toString } from "fp-ts/lib/function";
import { fromEither } from "fp-ts/lib/TaskEither";
import * as t from "io-ts";

import { Context } from "@azure/functions";

import { InstallationId } from "../generated/notifications/InstallationId";
import { Platform } from "../generated/notifications/Platform";

import { readableReport } from "italia-ts-commons/lib/reporters";

import {
  ActivityResult,
  ActivityResultSuccess,
  failActivity,
  retryActivity,
  success
} from "../utils/activity";
import { createOrUpdateInstallation } from "../utils/notification";
import {
  buildNHService,
  NotificationHubConfig
} from "../utils/notificationhubServicePartition";

// Activity Name
export const ActivityName = "HandleNHCreateOrUpdateInstallationCallActivity";

// Activity input
export const ActivityInput = t.interface({
  installationId: InstallationId,
  notificationHubConfig: NotificationHubConfig,
  platform: Platform,
  pushChannel: t.string,
  tags: t.readonlyArray(t.string, "array of string")
});

export type ActivityInput = t.TypeOf<typeof ActivityInput>;

/**
 * For each Notification Hub Message of type "Delete" calls related Notification Hub service
 */
export const getCallNHCreateOrUpdateInstallationActivityHandler = (
  logPrefix = "NHCreateOrUpdateCallServiceActivity"
) => async (context: Context, input: unknown) => {
  const failure = failActivity(context, logPrefix);
  return fromEither(ActivityInput.decode(input))
    .mapLeft(errs =>
      failure("Error decoding activity input", readableReport(errs))
    )
    .chain<ActivityResultSuccess>(activityInput => {
      context.log.info(
        `${logPrefix}|INSTALLATION_ID=${activityInput.installationId}`
      );

      const nhService = buildNHService(activityInput.notificationHubConfig);

      return createOrUpdateInstallation(
        nhService,
        activityInput.installationId,
        activityInput.platform,
        activityInput.pushChannel,
        activityInput.tags
      ).mapLeft(e =>
        retryActivity(context, `${logPrefix}|ERROR=${toString(e)}`)
      );
    })
    .fold<ActivityResult>(identity, success)
    .run();
};
