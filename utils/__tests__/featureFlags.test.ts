import { NHPartitionFeatureFlag } from "../config";
import { NonEmptyString } from "italia-ts-commons/lib/strings";
import * as featureFlags from "../featureFlags";

const aFiscalCodeHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" as NonEmptyString;

describe("featureFlags", () => {
  beforeAll(() => {
    jest.clearAllMocks();
  });

  it("should return true when feature flag all is enabled", () => {
    const res = featureFlags.getIsInActiveSubset(
      _ => false
    )(NHPartitionFeatureFlag.all, aFiscalCodeHash, [
      { RowKey: aFiscalCodeHash }
    ]);
    expect(res).toBe(true);
  });

  it("should return false when feature flag none is enabled", () => {
    const res = featureFlags.getIsInActiveSubset(
      _ => true
    )(NHPartitionFeatureFlag.none, aFiscalCodeHash, [
      { RowKey: aFiscalCodeHash }
    ]);
    expect(res).toBe(false);
  });

  it("should return true when feature flag beta is enabled adn user is a beta test user", () => {
    const res = featureFlags.getIsInActiveSubset(
      _ => true
    )(NHPartitionFeatureFlag.beta, aFiscalCodeHash, [
      { RowKey: aFiscalCodeHash }
    ]);
    expect(res).toBe(true);
  });

  it("should return false when feature flag beta is enabled adn user is NOT a beta test user", () => {
    const res = featureFlags.getIsInActiveSubset(
      _ => false
    )(NHPartitionFeatureFlag.beta, aFiscalCodeHash, [
      { RowKey: aFiscalCodeHash }
    ]);
    expect(res).toBe(false);
  });
});
