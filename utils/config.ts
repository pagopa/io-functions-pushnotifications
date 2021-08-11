/**
 * Config module
 *
 * Single point of access for the application confguration. Handles validation on required environment variables.
 * The configuration is evaluate eagerly at the first access to the module. The module exposes convenient methods to access such value.
 */

import * as t from "io-ts";
import { IntegerFromString } from "@pagopa/ts-commons/lib/numbers";
import { readableReport } from "@pagopa/ts-commons/lib/reporters";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { withDefault } from "@pagopa/ts-commons/lib/types";
import { CommaSeparatedListOf } from "@pagopa/ts-commons/lib/comma-separated-list";

import * as E from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import {
  DisjoitedNotificationHubPartitionArray,
  RegExpFromString
} from "./types";

export type NHPartitionFeatureFlag = t.TypeOf<typeof NHPartitionFeatureFlag>;
export const NHPartitionFeatureFlag = t.keyof({
  all: null,
  beta: null,
  canary: null,
  none: null
});

// Fixed Notification Hub partition configurations
// Partitions are meant to be fixed and not to be extendable at wish
// The following variables will be needed from the app configuration, but will then be computed into an array of struct for convenience
export type NotificationHubPartitionsConfig = t.TypeOf<
  typeof NotificationHubPartitionsConfig
>;
const NotificationHubPartitionsConfig = t.interface({
  NH1_ENDPOINT: NonEmptyString,
  NH1_NAME: NonEmptyString,
  NH1_PARTITION_REGEX: RegExpFromString,

  NH2_ENDPOINT: NonEmptyString,
  NH2_NAME: NonEmptyString,
  NH2_PARTITION_REGEX: RegExpFromString,

  NH3_ENDPOINT: NonEmptyString,
  NH3_NAME: NonEmptyString,
  NH3_PARTITION_REGEX: RegExpFromString,

  NH4_ENDPOINT: NonEmptyString,
  NH4_NAME: NonEmptyString,
  NH4_PARTITION_REGEX: RegExpFromString
});

/**
 * Global app configuration
 */
export type BaseConfig = t.TypeOf<typeof BaseConfig>;
const BaseConfig = t.intersection([
  t.interface({
    APPINSIGHTS_INSTRUMENTATIONKEY: NonEmptyString,
    // the internal function runtime has MaxTelemetryItem per second set to 20 by default
    // @see https://github.com/Azure/azure-functions-host/blob/master/src/WebJobs.Script/Config/ApplicationInsightsLoggerOptionsSetup.cs#L29
    APPINSIGHTS_SAMPLING_PERCENTAGE: withDefault(IntegerFromString, 5),

    AzureWebJobsStorage: NonEmptyString,

    NOTIFICATIONS_STORAGE_CONNECTION_STRING: NonEmptyString,
    RETRY_ATTEMPT_NUMBER: IntegerFromString,

    isProduction: t.boolean
  }),

  t.interface({
    // a list of fiscal codes not to send notifications to
    //   use case: when doing internal tests
    FISCAL_CODE_NOTIFICATION_BLACKLIST: withDefault(
      CommaSeparatedListOf(FiscalCode),
      []
    )
  }),

  // Legacy Notification Hub configuration
  t.interface({
    AZURE_NH_ENDPOINT: NonEmptyString,
    AZURE_NH_HUB_NAME: NonEmptyString
  }),

  t.interface({
    BETA_USERS_STORAGE_CONNECTION_STRING: NonEmptyString,
    BETA_USERS_TABLE_NAME: NonEmptyString,
    CANARY_USERS_REGEX: NonEmptyString,
    NH_PARTITION_FEATURE_FLAG: NHPartitionFeatureFlag
  }),
  t.partial({ APPINSIGHTS_DISABLE: t.string })
]);

/**
 * Extends the app base configuration
 * by computing fixed Notification Hub partition configurations
 * into a single array of struct named AZURE_NOTIFICATION_HUB_PARTITIONS.
 */
type WithComputedNHPartitions = BaseConfig & {
  readonly AZURE_NOTIFICATION_HUB_PARTITIONS: DisjoitedNotificationHubPartitionArray;
};
const WithComputedNHPartitions = new t.Type<
  WithComputedNHPartitions,
  BaseConfig & NotificationHubPartitionsConfig,
  BaseConfig & NotificationHubPartitionsConfig
>(
  "WithComputedNHPartitions",
  (v: unknown): v is WithComputedNHPartitions =>
    BaseConfig.is(v) && "AZURE_NOTIFICATION_HUB_PARTITIONS" in v,
  ({
    NH1_ENDPOINT,
    NH1_NAME,
    NH1_PARTITION_REGEX,
    NH2_ENDPOINT,
    NH2_NAME,
    NH2_PARTITION_REGEX,
    NH3_ENDPOINT,
    NH3_NAME,
    NH3_PARTITION_REGEX,
    NH4_ENDPOINT,
    NH4_NAME,
    NH4_PARTITION_REGEX,
    ...baseConfig
  }): t.Validation<WithComputedNHPartitions> =>
    // decode the fixed array of NH partitions...
    pipe(
      [
        {
          endpoint: NH1_ENDPOINT,
          name: NH1_NAME,
          partitionRegex: NH1_PARTITION_REGEX
        },
        {
          endpoint: NH2_ENDPOINT,
          name: NH2_NAME,
          partitionRegex: NH2_PARTITION_REGEX
        },
        {
          endpoint: NH3_ENDPOINT,
          name: NH3_NAME,
          partitionRegex: NH3_PARTITION_REGEX
        },
        {
          endpoint: NH4_ENDPOINT,
          name: NH4_NAME,
          partitionRegex: NH4_PARTITION_REGEX
        }
      ],
      DisjoitedNotificationHubPartitionArray.decode,
      // ...then add the key to the base config
      E.map(partitions => ({
        ...baseConfig,
        AZURE_NOTIFICATION_HUB_PARTITIONS: partitions
      }))
    ),
  (
    v: WithComputedNHPartitions
  ): BaseConfig & NotificationHubPartitionsConfig => {
    const { AZURE_NOTIFICATION_HUB_PARTITIONS, ...rest } = v;
    return {
      ...rest,
      ...AZURE_NOTIFICATION_HUB_PARTITIONS.reduce(
        (p, e, i) => ({
          ...p,
          // reconstruct the key set from the array
          [`NH${i}_ENDPOINT`]: e.endpoint,
          [`NH${i}_NAME`]: e.name,
          [`NH${i}_PARTITION_REGEX`]: e.partitionRegex
        }),
        {}
      )
    } as BaseConfig & NotificationHubPartitionsConfig; // cast needed because TS cannot understand types when we compose keys with strings
  }
);

export type IConfig = t.TypeOf<typeof IConfig>;
export const IConfig = t
  .intersection([BaseConfig, NotificationHubPartitionsConfig])
  .pipe(WithComputedNHPartitions);

// No need to re-evaluate this object for each call
const errorOrConfig: t.Validation<IConfig> = IConfig.decode({
  ...process.env,
  isProduction: process.env.NODE_ENV === "production"
});

/**
 * Read the application configuration and check for invalid values.
 * Configuration is eagerly evalued when the application starts.
 *
 * @returns either the configuration values or a list of validation errors
 */
export const getConfig = (): t.Validation<IConfig> => errorOrConfig;

/**
 * Read the application configuration and check for invalid values.
 * If the application is not valid, raises an exception.
 *
 * @returns the configuration values
 * @throws validation errors found while parsing the application configuration
 */
export const getConfigOrThrow = (): IConfig =>
  pipe(
    errorOrConfig,
    E.getOrElseW(errors => {
      throw new Error(`Invalid configuration: ${readableReport(errors)}`);
    })
  );
