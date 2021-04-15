/**
 * This file contains the functions used to create and return Notification Hub service
 */
import * as t from "io-ts";

import { NotificationHubService } from "azure-sb";
import { NonEmptyString } from "italia-ts-commons/lib/strings";
import { IConfig } from "./config";
import { ExtendedNotificationHubService } from "./notification";

export const NotificationHubConfig = t.interface({
  AZURE_NH_ENDPOINT: NonEmptyString,
  AZURE_NH_HUB_NAME: NonEmptyString
});

export type NotificationHubConfig = t.TypeOf<typeof NotificationHubConfig>;

/**
 * It returns the configuration related to the Legacy Notification Hub instance
 */
export const getNHLegacyConfig = (
  envConfig: IConfig
): NotificationHubConfig => ({
  AZURE_NH_ENDPOINT: envConfig.AZURE_NH_ENDPOINT,
  AZURE_NH_HUB_NAME: envConfig.AZURE_NH_HUB_NAME
});

/**
 * It returns an ExtendedNotificationHubService related to one of the new Notification Hub instances
 * based on the partion mechanism defined
 *
 * @param fiscalCodeHash a valid hash256 representing a Fiscal Code
 */
export const getNHService = (
  fiscalCodeHash: string
): ExtendedNotificationHubService => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const fs = fiscalCodeHash;
  throw new Error("It should not be called");
};

/**
 * @param config The NotificationHubConfig
 * @returns a NotificationHubService used to call Notification Hub APIs
 */
export const buildNHService = ({
  AZURE_NH_HUB_NAME,
  AZURE_NH_ENDPOINT
}: NotificationHubConfig): NotificationHubService =>
  new ExtendedNotificationHubService(AZURE_NH_HUB_NAME, AZURE_NH_ENDPOINT);
