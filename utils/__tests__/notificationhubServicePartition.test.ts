import { NonEmptyString } from "italia-ts-commons/lib/strings";
import {
  getNHLegacyConfig,
  getNHService
} from "../notificationhubServicePartition";

import { envConfig } from "../../__mocks__/env-config.mock";

const aFiscalCodeHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" as NonEmptyString;

describe("NotificationHubServicepartition", () => {
  it("should return always NH0 Configuration", () => {
    const nhConfig = getNHLegacyConfig(envConfig);

    expect(nhConfig.AZURE_NH_ENDPOINT).toBe(envConfig.AZURE_NH_ENDPOINT);
    expect(nhConfig.AZURE_NH_HUB_NAME).toBe(envConfig.AZURE_NH_HUB_NAME);
  });
  it("should throw error calling getNHService", () => {
    expect(() => getNHService(aFiscalCodeHash)).toThrowError();
  });
});
