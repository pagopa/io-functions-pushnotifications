/**
 * Config module
 *
 * Single point of access for the application confguration. Handles validation on required environment variables.
 * The configuration is evaluate eagerly at the first access to the module. The module exposes convenient methods to access such value.
 */

import * as t from "io-ts";
import { IntegerFromString } from "italia-ts-commons/lib/numbers";
import { readableReport } from "italia-ts-commons/lib/reporters";
import { NonEmptyString } from "italia-ts-commons/lib/strings";
import { withDefault } from "italia-ts-commons/lib/types";
import { nhDisjoitedFirstCharacterPartitionReadonlyArray } from "./types";

export type NHPartitionFeatureFlag = t.TypeOf<typeof NHPartitionFeatureFlag>;
export const NHPartitionFeatureFlag = t.keyof({
  all: null,
  beta: null,
  canary: null,
  none: null
});

// global app configuration
export type IConfig = t.TypeOf<typeof IConfig>;
export const IConfig = t.intersection([
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

  t.refinement(
    t.interface({
      AZURE_NH_ENDPOINT: NonEmptyString,
      AZURE_NH_HUB_NAME: NonEmptyString,

      AZURE_NOTIFICATION_HUB_PARTITIONS: nhDisjoitedFirstCharacterPartitionReadonlyArray,

      // eslint-disable-next-line sort-keys
      AZURE_NH_PARTITION_1_ENDPOINT: NonEmptyString,
      AZURE_NH_PARTITION_1_HUB_NAME: NonEmptyString,

      AZURE_NH_PARTITION_2_ENDPOINT: NonEmptyString,
      AZURE_NH_PARTITION_2_HUB_NAME: NonEmptyString,

      AZURE_NH_PARTITION_3_ENDPOINT: NonEmptyString,
      AZURE_NH_PARTITION_3_HUB_NAME: NonEmptyString,

      AZURE_NH_PARTITION_4_ENDPOINT: NonEmptyString,
      AZURE_NH_PARTITION_4_HUB_NAME: NonEmptyString
    }),
    config =>
      // Every p.envVariablePrefix should match two env variables,
      // ending with "_ENDPOINT" and "_HUB_NAME"
      config.AZURE_NOTIFICATION_HUB_PARTITIONS.every(
        p =>
          Object.keys(config).includes(p.envVariablePrefix + "_ENDPOINT") &&
          Object.keys(config).includes(p.envVariablePrefix + "_HUB_NAME")
      ) &&
      // Every p.envVariablePrefix should be unique
      config.AZURE_NOTIFICATION_HUB_PARTITIONS.map(
        p => p.envVariablePrefix
      ).every((e, i, a) => a.indexOf(e) === i)
  ),

  t.interface({
    BETA_USERS_STORAGE_CONNECTION_STRING: NonEmptyString,
    BETA_USERS_TABLE_NAME: NonEmptyString,
    CANARY_USERS_REGEX: NonEmptyString,
    NH_PARTITION_FEATURE_FLAG: NHPartitionFeatureFlag
  }),
  t.partial({ APPINSIGHTS_DISABLE: t.string })
]);

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
