import { Option, some } from "fp-ts/lib/Option";
import { getConfigOrThrow } from "./config";
import { ExtendedNotificationHubService } from "./notification";

export function getNHLegacyService(): Option<ExtendedNotificationHubService> {
  return some(createNH0Service());
}

export function getNHService(
  fiscalCodeHash: string
): Option<ExtendedNotificationHubService> {
  // tslint:disable-next-line: no-tslint-disable-all
  // tslint:disable-next-line
  const fs = fiscalCodeHash;

  return some(createNH0Service());
}

export function createNH0Service(): ExtendedNotificationHubService {
  const config = getConfigOrThrow();

  return new ExtendedNotificationHubService(
    config.AZURE_NH_HUB_NAME,
    config.AZURE_NH_ENDPOINT
  );
}
