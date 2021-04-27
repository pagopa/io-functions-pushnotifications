/**
 * Config module
 *
 * Single point of access for the application confguration. Handles validation on required environment variables.
 * The configuration is evaluate eagerly at the first access to the module. The module exposes convenient methods to access such value.
 */

import { None } from "fp-ts/lib/Option";
import * as t from "io-ts";
import { IntegerFromString } from "italia-ts-commons/lib/numbers";
import { readableReport } from "italia-ts-commons/lib/reporters";
import { NonEmptyString } from "italia-ts-commons/lib/strings";
import { withDefault } from "italia-ts-commons/lib/types";
import {
  DisjoitedNotificationHubPartitionArray,
  jsonFromString,
  NotificationHubPartition,
  RegExpFromString
} from "./types";

export type NHPartitionFeatureFlag = t.TypeOf<typeof NHPartitionFeatureFlag>;
export const NHPartitionFeatureFlag = t.keyof({
  all: null,
  beta: null,
  canary: null,
  none: null
});

// global app configuration
//const UnknownToEnvWithScalarValues = {} as t.Mixed; // {...process.env, NH1_NAME.....}
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
    AZURE_NH_ENDPOINT: NonEmptyString,
    AZURE_NH_HUB_NAME: NonEmptyString,

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
  }),

  t.interface({
    BETA_USERS_STORAGE_CONNECTION_STRING: NonEmptyString,
    BETA_USERS_TABLE_NAME: NonEmptyString,
    CANARY_USERS_REGEX: NonEmptyString,
    NH_PARTITION_FEATURE_FLAG: NHPartitionFeatureFlag
  }),
  t.partial({ APPINSIGHTS_DISABLE: t.string })
]);

type A = Exclude<
  BaseConfig,
  | "NH1_ENDPOINT"
  | "NH1_NAME"
  | "NH1_PARTITION_REGEX"
  | "NH2_ENDPOINT"
  | "NH2_NAME"
  | "NH2_PARTITION_REGEX"
  | "NH3_ENDPOINT"
  | "NH3_NAME"
  | "NH3_PARTITION_REGEX"
  | "NH4_ENDPOINT"
  | "NH4_NAME"
  | "NH4_PARTITION_REGEX"
> & {
  readonly AZURE_NOTIFICATION_HUB_PARTITIONS: DisjoitedNotificationHubPartitionArray;
};

const NhConfigToBase = new t.Type<A, BaseConfig, BaseConfig>(
  "NhConfigToBase",
  (v: unknown): v is A =>
    BaseConfig.is(v) && "AZURE_NOTIFICATION_HUB_PARTITIONS" in v,
  (v, _c): t.Validation<A> => {
    const {
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
      ...rest
    } = v;
    const baseConfig = rest as BaseConfig;
    const nhPartitions = [
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
    ];
    return DisjoitedNotificationHubPartitionArray.decode(nhPartitions).map(
      partitions => ({
        ...baseConfig,
        AZURE_NOTIFICATION_HUB_PARTITIONS: partitions
      })
    );
  },
  (v: A): BaseConfig => {
    const { AZURE_NOTIFICATION_HUB_PARTITIONS, ...rest } = v;
    return {
      ...rest,
      ...AZURE_NOTIFICATION_HUB_PARTITIONS.reduce(
        (p, e, i) => ({
          ...p,
          [`NH${i}_ENDPOINT`]: e.endpoint,
          [`NH${i}_NAME`]: e.name,
          [`NH${i}_PARTITION_REGEX`]: e.partitionRegex
        }),
        {}
      )
    };
  }
);

export type IConfig = t.TypeOf<typeof IConfig>;
export const IConfig = BaseConfig.pipe(NhConfigToBase);

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
  errorOrConfig.getOrElseL(errors => {
    throw new Error(`Invalid configuration: ${readableReport(errors)}`);
  });
