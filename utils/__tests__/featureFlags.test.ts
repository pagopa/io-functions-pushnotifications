import { NonEmptyString } from "italia-ts-commons/lib/strings";
import * as featureFlags from "../featureFlags";

const aFiscalCodeHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" as NonEmptyString;

describe("featureFlags", () => {
  beforeAll(() => {
    jest.clearAllMocks();
  });

  it("should return true when feature flag all is enabled", () => {
    const res = featureFlags.getIsInActiveSubset(_ => false)(
      "all",
      aFiscalCodeHash,
      [{ RowKey: aFiscalCodeHash }]
    );
    expect(res).toBe(true);
  });

  it("should return false when feature flag none is enabled", () => {
    const res = featureFlags.getIsInActiveSubset(_ => true)(
      "none",
      aFiscalCodeHash,
      [{ RowKey: aFiscalCodeHash }]
    );
    expect(res).toBe(false);
  });

  it("should return true when feature flag beta is enabled adn user is a beta test user", () => {
    const res = featureFlags.getIsInActiveSubset(_ => true)(
      "beta",
      aFiscalCodeHash,
      [{ RowKey: aFiscalCodeHash }]
    );
    expect(res).toBe(true);
  });

  it("should return false when feature flag beta is enabled adn user is NOT a beta test user", () => {
    const res = featureFlags.getIsInActiveSubset(_ => false)(
      "beta",
      aFiscalCodeHash,
      [{ RowKey: aFiscalCodeHash }]
    );
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
