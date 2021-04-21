import { NotificationHubService } from "azure-sb";
import { fromNullable, left } from "fp-ts/lib/Either";
import * as t from "io-ts";

import { NonEmptyString } from "italia-ts-commons/lib/strings";
import { InstallationId } from "../generated/notifications/InstallationId";
import { IConfig } from "./config";
import { ExtendedNotificationHubService } from "./notification";

export const NotificationHubConfig = t.interface({
  AZURE_NH_ENDPOINT: NonEmptyString,
  AZURE_NH_HUB_NAME: NonEmptyString
});

export type NotificationHubConfig = t.TypeOf<typeof NotificationHubConfig>;

/**
 * It returns the configuration related to the Legacy Notification Hub instance
 *
 * @param envConfig the env config, containing
 *                  `AZURE_NH_ENDPOINT` and `AZURE_NH_HUB_NAME` variables
 */
export const getNHLegacyConfig = (
  envConfig: IConfig
): NotificationHubConfig => ({
  AZURE_NH_ENDPOINT: envConfig.AZURE_NH_ENDPOINT,
  AZURE_NH_HUB_NAME: envConfig.AZURE_NH_HUB_NAME
});

/**
 * @param sha The sha to test
 * @returns
 */
export const testShaForPartitionRegex = (
  regex: string,
  sha: InstallationId
): boolean => new RegExp(regex).test(sha);

/**
 * It returns the configuration related to the Notification Hub partition instance
 *
 * @param envConfig The environment config
 * @param envVariableName The variable name prefix related to the couple endpoint-hub name
 *                        of the notification hub to retrieve
 * @returns A connection string based on NH namespace and sharedAccessKey provided
 */
export const getNHPartitionConfig = (
  envConfig: IConfig,
  envVariableName: string
): NotificationHubConfig => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AZURE_NH_ENDPOINT: (envConfig as any)[
    envVariableName + "_ENDPOINT"
  ] as NonEmptyString,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AZURE_NH_HUB_NAME: (envConfig as any)[
    envVariableName + "_HUB_NAME"
  ] as NonEmptyString
});

/**
 * It returns the configuration related to one of the new Notification Hub instances
 * based on the partion mechanism defined
 *
 * @param envConfig the env config with Notification Hub connection strings and names
 * @param sha a valid hash256 representing a Fiscal Code
 */
export const getNotificationHubPartitionConfig = (envConfig: IConfig) => (
  sha: InstallationId
): NotificationHubConfig =>
  fromNullable(left(null))(
    envConfig.AZURE_NOTIFICATION_HUB_PARTITIONS.find(p =>
      testShaForPartitionRegex(p.partitionRegex, sha)
    )
  )
    .map(p => getNHPartitionConfig(envConfig, p.envVariablePrefix))
    .getOrElseL(_ => {
      throw new Error(`Unable to find Notification Hub partition for ${sha}`);
    });

/**
 * @param config The NotificationHubConfig
 * @returns a NotificationHubService used to call Notification Hub APIs
 */
export const buildNHService = ({
  AZURE_NH_HUB_NAME,
  AZURE_NH_ENDPOINT
}: NotificationHubConfig): NotificationHubService =>
  new ExtendedNotificationHubService(AZURE_NH_HUB_NAME, AZURE_NH_ENDPOINT);
