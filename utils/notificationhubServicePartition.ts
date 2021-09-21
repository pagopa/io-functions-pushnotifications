import { NotificationHubService } from "azure-sb";
import * as t from "io-ts";

import * as E from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";

import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
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
  regex: RegExp | string,
  sha: InstallationId
): boolean => (typeof regex === "string" ? new RegExp(regex) : regex).test(sha);

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
  pipe(
    envConfig.AZURE_NOTIFICATION_HUB_PARTITIONS.find(p =>
      testShaForPartitionRegex(p.partitionRegex, sha)
    ),
    E.fromNullable(
      Error(`Unable to find Notification Hub partition for ${sha}`)
    ),
    E.map(partition => ({
      AZURE_NH_ENDPOINT: partition.endpoint,
      AZURE_NH_HUB_NAME: partition.name
    })),
    E.getOrElseW(e => {
      throw e;
    })
  );

/**
 * @param config The NotificationHubConfig
 * @returns a NotificationHubService used to call Notification Hub APIs
 */
export const buildNHService = ({
  AZURE_NH_HUB_NAME,
  AZURE_NH_ENDPOINT
}: NotificationHubConfig): NotificationHubService =>
  new ExtendedNotificationHubService(AZURE_NH_HUB_NAME, AZURE_NH_ENDPOINT);
