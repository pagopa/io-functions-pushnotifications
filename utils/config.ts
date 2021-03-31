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
import { enumType, withDefault } from "italia-ts-commons/lib/types";

export enum NHPartitionFeatureFlag {
  "none" = "none",
  "beta" = "beta",
  "canary" = "canary",
  "all" = "all"
}

// global app configuration
export type IConfig = t.TypeOf<typeof IConfig>;
export const IConfig = t.intersection([
  t.interface({
    NH_PARTITION_FEATURE_FLAG: enumType<NHPartitionFeatureFlag>(
      NHPartitionFeatureFlag,
      "NHPartitionFeatureFlag"
    ),

    RETRY_ATTEMPT_NUMBER: IntegerFromString,

    AZURE_NH_ENDPOINT: NonEmptyString,
    AZURE_NH_HUB_NAME: NonEmptyString,

    AzureWebJobsStorage: NonEmptyString,
    NOTIFICATIONS_STORAGE_CONNECTION_STRING: NonEmptyString,

    APPINSIGHTS_INSTRUMENTATIONKEY: NonEmptyString,
    // the internal function runtime has MaxTelemetryItem per second set to 20 by default
    // @see https://github.com/Azure/azure-functions-host/blob/master/src/WebJobs.Script/Config/ApplicationInsightsLoggerOptionsSetup.cs#L29
    APPINSIGHTS_SAMPLING_PERCENTAGE: withDefault(IntegerFromString, 5),

    isProduction: t.boolean
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
export function getConfig(): t.Validation<IConfig> {
  return errorOrConfig;
}

/**
 * Read the application configuration and check for invalid values.
 * If the application is not valid, raises an exception.
 *
 * @returns the configuration values
 * @throws validation errors found while parsing the application configuration
 */
export function getConfigOrThrow(): IConfig {
  return errorOrConfig.getOrElseL(errors => {
    throw new Error(`Invalid configuration: ${readableReport(errors)}`);
  });
}
