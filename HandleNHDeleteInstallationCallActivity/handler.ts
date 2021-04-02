import { Context } from "@azure/functions";
import { toString } from "fp-ts/lib/function";
import { fromEither } from "fp-ts/lib/TaskEither";
import * as t from "io-ts";

import { readableReport } from "italia-ts-commons/lib/reporters";
import { NonEmptyString } from "italia-ts-commons/lib/strings";

import {
  ActivityResult,
  ActivityResultFailure,
  ActivityResultSuccess,
  success
} from "../utils/activity";
import { deleteInstallation } from "../utils/notification";
import {
  buildNHService,
  NotificationHubConfig
} from "../utils/notificationhubServicePartition";

// Activity input
export type ActivityInput = t.TypeOf<typeof ActivityInput>;
export const ActivityInput = t.interface({
  installationId: NonEmptyString,
  notificationHubConfig: NotificationHubConfig
});

const failActivity = (context: Context, logPrefix: string) => (
  errorMessage: string,
  errorDetails?: string
) => {
  const details = errorDetails ? `|ERROR_DETAILS=${errorDetails}` : ``;
  context.log.error(`${logPrefix}|${errorMessage}${details}`);
  return ActivityResultFailure.encode({
    kind: "FAILURE",
    reason: errorMessage
  });
};

/**
 * For each Notification Hub Message of type "Delete" calls related Notification Hub service
 */
export const getCallNHDeleteInstallationActivityHandler = (
  logPrefix = "NHDeleteCallServiceActivity"
) => async (context: Context, input: unknown): Promise<ActivityResult> => {
  const failure = failActivity(context, logPrefix);
  return fromEither(ActivityInput.decode(input))
    .mapLeft(errs =>
      failure("Error decoding activity input", readableReport(errs))
    )
    .chain<ActivityResultSuccess>(
      ({ installationId, notificationHubConfig }) => {
        context.log.info(`${logPrefix}|INSTALLATION_ID=${installationId}`);

        const nhService = buildNHService(notificationHubConfig);

        return deleteInstallation(nhService, installationId).mapLeft(e => {
          // do not trigger a retry as delete may fail in case of 404
          context.log.error(`${logPrefix}|ERROR=${toString(e)}`);
          return failure(e.message);
        });
      }
    )
    .fold<ActivityResult>(
      err => err,
      _ => success()
    )
    .run();
};
