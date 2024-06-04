import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";

import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as healthcheck from "@pagopa/io-functions-commons/dist/src/utils/healthcheck";
import { buildNHService } from "./notificationhubServicePartition";

/**
 * Check connections to Notification Hubs
 *
 * @returns either true or an array of error messages
 */
export const checkAzureNotificationHub = (
  AZURE_NH_CONNECTION_STRING: NonEmptyString,
  AZURE_NH_HUB_NAME: NonEmptyString
): healthcheck.HealthCheck<"AzureNotificationHub"> =>
  pipe(
    TE.tryCatch(
      () =>
        buildNHService({
          AZURE_NH_CONNECTION_STRING,
          AZURE_NH_HUB_NAME
        }).deleteInstallation("aFakeInstallation"),
      healthcheck.toHealthProblems("AzureNotificationHub")
    ),
    TE.map(_ => true)
  );
