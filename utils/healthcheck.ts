import {
  common as azurestorageCommon,
  createBlobService,
  createFileService,
  createQueueService,
  createTableService
} from "azure-storage";

import { sequenceT } from "fp-ts/lib/Apply";
import * as A from "fp-ts/lib/Array";
import * as RA from "fp-ts/lib/ReadonlyArray";
import * as TE from "fp-ts/lib/TaskEither";
import * as T from "fp-ts/lib/Task";
import { TaskEither } from "fp-ts/lib/TaskEither";
import { toError } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";

import { readableReport } from "@pagopa/ts-commons/lib/reporters";

import { getConfig, IConfig } from "./config";
import { NHResultSuccess } from "./notification";
import { buildNHService } from "./notificationhubServicePartition";

type ProblemSource = "AzureStorage" | "AzureNotificationHub" | "Config" | "Url";
export type HealthProblem<S extends ProblemSource> = string & {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  readonly __source: S;
};
export type HealthCheck<
  S extends ProblemSource = ProblemSource,
  T = true
> = TaskEither<ReadonlyArray<HealthProblem<S>>, T>;

// format and cast a problem message with its source
const formatProblem = <S extends ProblemSource>(
  source: S,
  message: string
): HealthProblem<S> => `${source}|${message}` as HealthProblem<S>;

// utility to format an unknown error to an arry of HealthProblem
const toHealthProblems = <S extends ProblemSource>(source: S) => (
  e: unknown
): ReadonlyArray<HealthProblem<S>> => [
  formatProblem(source, toError(e).message)
];

/**
 * Check application's configuration is correct
 *
 * @returns either true or an array of error messages
 */
export const checkConfigHealth = (): HealthCheck<"Config", IConfig> =>
  pipe(
    getConfig(),
    TE.fromEither,
    TE.mapLeft(errors =>
      errors.map(e =>
        // give each problem its own line
        formatProblem("Config", readableReport([e]))
      )
    )
  );
/**
 * Check connections to Notification Hubs
 *
 * @returns either true or an array of error messages
 */
export const checkAzureNotificationHub = ({
  AZURE_NH_ENDPOINT,
  AZURE_NH_HUB_NAME,
  AZURE_NOTIFICATION_HUB_PARTITIONS
}: IConfig): HealthCheck<"AzureNotificationHub"> => {
  const applicativeValidation = TE.getApplicativeTaskValidation(
    T.ApplicativePar,
    RA.getSemigroup<HealthProblem<"AzureNotificationHub">>()
  );
  return pipe(
    [
      { AZURE_NH_ENDPOINT, AZURE_NH_HUB_NAME },
      ...AZURE_NOTIFICATION_HUB_PARTITIONS.map(p => ({
        AZURE_NH_ENDPOINT: p.endpoint,
        AZURE_NH_HUB_NAME: p.name
      }))
    ].map(connString =>
      TE.tryCatch(
        () =>
          new Promise<NHResultSuccess>((resolve, reject) =>
            buildNHService({
              AZURE_NH_ENDPOINT: connString.AZURE_NH_ENDPOINT,
              AZURE_NH_HUB_NAME: connString.AZURE_NH_HUB_NAME
            }).deleteInstallation(
              "aFakeInstallation",
              (err, _) =>
                err == null
                  ? resolve({ kind: "SUCCESS" })
                  : reject(err.message.replace(/\n/gim, " ")) // avoid newlines
            )
          ),
        toHealthProblems("AzureNotificationHub")
      )
    ),
    A.sequence(applicativeValidation),
    TE.map(_ => true)
  );
};

/**
 * Check the application can connect to an Azure Storage
 *
 * @param connStr connection string for the storage
 *
 * @returns either true or an array of error messages
 */
export const checkAzureStorageHealth = (
  connStr: string
): HealthCheck<"AzureStorage"> => {
  const applicativeValidation = TE.getApplicativeTaskValidation(
    T.ApplicativePar,
    RA.getSemigroup<HealthProblem<"AzureStorage">>()
  );

  return pipe(
    // try to instantiate a client for each product of azure storage
    [
      createBlobService,
      createFileService,
      createQueueService,
      createTableService
    ]
      // for each, create a task that wraps getServiceProperties
      .map(createService =>
        TE.tryCatch(
          () =>
            new Promise<
              azurestorageCommon.models.ServicePropertiesResult.ServiceProperties
            >((resolve, reject) =>
              createService(connStr).getServiceProperties((err, result) => {
                // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                err
                  ? reject(err.message.replace(/\n/gim, " ")) // avoid newlines
                  : resolve(result);
              })
            ),
          toHealthProblems("AzureStorage")
        )
      ),
    A.sequence(applicativeValidation),
    TE.map(_ => true)
  );
};

/**
 * Execute all the health checks for the application
 *
 * @returns either true or an array of error messages
 */
export const checkApplicationHealth = (): HealthCheck<ProblemSource, true> => {
  const applicativeValidation = TE.getApplicativeTaskValidation(
    T.ApplicativePar,
    RA.getSemigroup<HealthProblem<ProblemSource>>()
  );

  return pipe(
    void 0,
    TE.of,
    TE.chain(_ => checkConfigHealth()),
    TE.chain(config =>
      pipe(
        sequenceT(applicativeValidation)(
          checkAzureStorageHealth(
            config.NOTIFICATIONS_STORAGE_CONNECTION_STRING
          ),
          checkAzureNotificationHub(config)
        ),
        TE.map(_ => true)
      )
    )
  );
};
