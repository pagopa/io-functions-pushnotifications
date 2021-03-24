import { toString } from "fp-ts/lib/function";
import { fromEither } from "fp-ts/lib/TaskEither";
import * as t from "io-ts";

import { Context } from "@azure/functions";

import { readableReport } from "italia-ts-commons/lib/reporters";

import { CreateOrUpdateInstallationMessage } from "../generated/notifications/CreateOrUpdateInstallationMessage";

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

// Activity input
export const ActivityInput = t.interface({
  message: CreateOrUpdateInstallationMessage,
  notificationHubConfig: NotificationHubConfig
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
    .chain<ActivityResultSuccess>(({ message, notificationHubConfig }) => {
      context.log.info(
        `${logPrefix}|${message.kind}|INSTALLATION_ID=${message.installationId}`
      );

      const nhService = buildNHService(notificationHubConfig);

      return createOrUpdateInstallation(
        nhService,
        message.installationId,
        message.platform,
        message.pushChannel,
        message.tags
      ).mapLeft(e =>
        retryActivity(context, `${logPrefix}|ERROR=${toString(e)}`)
      );
    })
    .fold<ActivityResult>(
      err => err,
      _ => success()
    )
    .run();
};
