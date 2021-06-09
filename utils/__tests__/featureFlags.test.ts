import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { InstallationId } from "../../generated/notifications/InstallationId";
import * as featureFlags from "../featureFlags";

import { envConfig } from "../../__mocks__/env-config.mock";

const aFiscalCodeHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" as NonEmptyString;

const canaryRegex = envConfig.CANARY_USERS_REGEX;

describe("featureFlags", () => {
  beforeAll(() => {
    jest.clearAllMocks();
  });

  it("should return true when feature flag all is enabled", () => {
    const res = featureFlags.getIsInActiveSubset(
      _ => false,
      _ => false
    )("all", aFiscalCodeHash, [{ RowKey: aFiscalCodeHash }]);
    expect(res).toBe(true);
  });

  it("should return false when feature flag none is enabled", () => {
    const res = featureFlags.getIsInActiveSubset(
      _ => true,
      _ => false
    )("none", aFiscalCodeHash, [{ RowKey: aFiscalCodeHash }]);
    expect(res).toBe(false);
  });

  it("should return true when feature flag beta is enabled adn user is a beta test user", () => {
    const res = featureFlags.getIsInActiveSubset(
      _ => true,
      _ => false
    )("beta", aFiscalCodeHash, [{ RowKey: aFiscalCodeHash }]);
    expect(res).toBe(true);
  });

  it("should return false when feature flag beta is enabled adn user is NOT a beta test user", () => {
    const res = featureFlags.getIsInActiveSubset(
      _ => false,
      _ => false
    )("beta", aFiscalCodeHash, [{ RowKey: aFiscalCodeHash }]);
    expect(res).toBe(false);
  });
});

describe("getIsUserABetaTestUser", () => {
  beforeAll(() => {
    jest.clearAllMocks();
  });

  it("should return true if sha is contained in beta users table", () => {
    const res = featureFlags.getIsUserABetaTestUser()(
      [{ RowKey: aFiscalCodeHash }],
      aFiscalCodeHash
    );
    expect(res).toBe(true);
  });

  it("should return false if sha is NOT contained in beta users table", () => {
    const res = featureFlags.getIsUserABetaTestUser()([], aFiscalCodeHash);
    expect(res).toBe(false);
  });
});

describe("getIsUserACanaryTestUser", () => {
  beforeAll(() => {
    jest.clearAllMocks();
  });

  it("isUserACanaryTestUser should return true if sha is a valid installationId for regex", () => {
    const validInstallationId = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b850" as InstallationId;
    const validInstallationId2 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b851" as InstallationId;

    const isUserABetaTestUser = featureFlags.getIsUserACanaryTestUser(
      canaryRegex
    );

    const test1 = isUserABetaTestUser(validInstallationId);
    expect(test1).toBeTruthy();

    const test3 = isUserABetaTestUser(validInstallationId2);
    expect(test3).toBeTruthy();
  });

  it("isUserACanaryTestUser should return flase if sha is NOT a valid installationId for regex", () => {
    const invalidInstallationId = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" as InstallationId;
    const invalidInstallationId2 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b891" as InstallationId;

    const isUserABetaTestUser = featureFlags.getIsUserACanaryTestUser(
      canaryRegex
    );

    const test2 = isUserABetaTestUser(invalidInstallationId);
    expect(test2).toBeFalsy();

    const test4 = isUserABetaTestUser(invalidInstallationId2);
    expect(test4).toBeFalsy();
  });
});
