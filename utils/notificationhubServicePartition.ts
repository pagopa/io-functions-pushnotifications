/**
 * This file contains the functions used to create and return Notification Hub service
 */

import { getConfigOrThrow } from "./config";
import { ExtendedNotificationHubService } from "./notification";

const config = getConfigOrThrow();

/**
 * It returns an ExtendedNotificationHubService related to the Legacy Notification Hub instance
 */
export function getNHLegacyService(): ExtendedNotificationHubService {
  return createNH0Service();
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

export function createNH0Service(): ExtendedNotificationHubService {
  return new ExtendedNotificationHubService(
    config.AZURE_NH_HUB_NAME,
    config.AZURE_NH_ENDPOINT
  );
}
