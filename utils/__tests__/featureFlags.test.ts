import { isLeft, isRight } from "fp-ts/lib/Either";
import { IConfig, NHPartitionFeatureFlag } from "../config";
import * as t from "io-ts";
import { IntegerFromString } from "italia-ts-commons/lib/numbers";
import { NonEmptyString } from "italia-ts-commons/lib/strings";
import * as featureFlags from "../featureFlags";

const aFiscalCodeHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" as NonEmptyString;

describe("IConfig", () => {
  it("should return `true` when feature flag `all` is enabled", () => {
    var valueIsContained = featureFlags.isInActiveSubset(
      NHPartitionFeatureFlag.all,
      aFiscalCodeHash
    );

    expect(valueIsContained).toBeTruthy();
  });
  it("should return `false` when feature flag `none` is enabled", () => {
    var valueIsContained = featureFlags.isInActiveSubset(
      NHPartitionFeatureFlag.none,
      aFiscalCodeHash
    );

    expect(valueIsContained).toBeFalsy();
  });
});
