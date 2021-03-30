/**
 * This file contains the functions used to create and return Notification Hub service
 */

import { NotificationHubService } from "azure-sb";
import { getConfigOrThrow, IConfig } from "./config";
import { ExtendedNotificationHubService } from "./notification";

export type NotificationHubConfig = Pick<
  IConfig,
  "AZURE_NH_HUB_NAME" | "AZURE_NH_ENDPOINT"
>;

const envConfig = getConfigOrThrow();

/**
 * It returns an ExtendedNotificationHubService related to the Legacy Notification Hub instance
 */
export function getNHLegacyService(): NotificationHubService {
  return createNHService(envConfig);
}

/**
 * It returns an ExtendedNotificationHubService related to one of the new Notification Hub instances
 * based on the partion mechanism defined
 * @param fiscalCodeHash a valid hash256 representing a Fiscal Code
 */
export function getNHService(
  fiscalCodeHash: string
): ExtendedNotificationHubService {
  // tslint:disable-next-line: no-tslint-disable-all
  // tslint:disable-next-line
  const fs = fiscalCodeHash;

  throw new Error("It should not be called");
}

/**
 * @param config The NotificationHubConfig
 * @returns a NotificationHubService used to call Notification Hub APIs
 */
export function createNHService(
  config: NotificationHubConfig
): NotificationHubService {
  return new ExtendedNotificationHubService(
    config.AZURE_NH_HUB_NAME,
    config.AZURE_NH_ENDPOINT
  );
}
