import { isLeft, isRight, right } from "fp-ts/lib/Either";
import { IConfig, NHPartitionFeatureFlag } from "../config";
import * as t from "io-ts";
import { IntegerFromString } from "italia-ts-commons/lib/numbers";
import { NonEmptyString } from "italia-ts-commons/lib/strings";
import * as featureFlags from "../featureFlags";
import { fromEither } from "fp-ts/lib/TaskEither";

const aFiscalCodeHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" as NonEmptyString;

describe("featureFlags", () => {
  it("should return `true` when feature flag `all` is enabled", () => {
    expect.assertions(2);

    featureFlags
      .getIsInActiveSubset(_ => fromEither(right(false)))(
        NHPartitionFeatureFlag.all,
        aFiscalCodeHash
      )
      .run()
      .then(v => {
        expect(isRight(v)).toBeTruthy();
        expect(v.value).toBeTruthy();
      });
  });
  it("should return `false` when feature flag `none` is enabled", () => {
    expect.assertions(2);

    featureFlags
      .getIsInActiveSubset(_ => fromEither(right(false)))(
        NHPartitionFeatureFlag.none,
        aFiscalCodeHash
      )
      .run()
      .then(v => {
        expect(isRight(v)).toBeTruthy();
        expect(v.value).toBeFalsy();
      });
  });
});
