import { fromEither } from "fp-ts/lib/TaskEither";
import { isLeft, isRight, left, right } from "fp-ts/lib/Either";

import { NHPartitionFeatureFlag } from "../../utils/config";
import { getIsInActiveSubset } from "../../utils/featureFlags";

import { context as contextMock } from "../../__mocks__/durable-functions";

import {
  ActivityInput,
  ActivitySuccessWithValue,
  getIsUserInActiveSubsetHandler
} from "../handler";
import { NonEmptyString } from "italia-ts-commons/lib/strings";
import { ActivityResultFailure } from "../../utils/activity";

const aFiscalCodeHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" as NonEmptyString;

const userIsInActiveSubset: ReturnType<typeof getIsInActiveSubset> = _ =>
  fromEither(right(true));

const userIsNotInActiveSubset: ReturnType<typeof getIsInActiveSubset> = _ =>
  fromEither(right(false));

const userIsInActiveSubset_Error: ReturnType<typeof getIsInActiveSubset> = _ =>
  fromEither(left(new Error("Test Error")));

describe("IsUserInActiveSubsetActivity - Beta Test Users", () => {
  it("should return false if `userIsNotInActiveSubset` return true", async () => {
    const handler = getIsUserInActiveSubsetHandler(userIsInActiveSubset);

    var result = await handler(contextMock as any, {
      enabledFeatureFlag: NHPartitionFeatureFlag.beta,
      sha: aFiscalCodeHash
    });

    ActivitySuccessWithValue.decode(result).fold(
      _ => fail(),
      r => expect(r.value).toBe(true)
    );
  });

  it("should return false if `userIsNotInActiveSubset` return false", async () => {
    const handler = getIsUserInActiveSubsetHandler(userIsNotInActiveSubset);

    const input = ActivityInput.encode({
      enabledFeatureFlag: NHPartitionFeatureFlag.beta,
      sha: aFiscalCodeHash
    });
    var result = await handler(contextMock as any, input);

    ActivitySuccessWithValue.decode(result).fold(
      _ => fail(),
      r => expect(r.value).toBe(false)
    );
  });

  it("should throw Exception if an error occurred in `userIsNotInActiveSubset` function", async () => {
    const handler = getIsUserInActiveSubsetHandler(userIsInActiveSubset_Error);

    expect.assertions(1);
    try {
      const input = ActivityInput.encode({
        enabledFeatureFlag: NHPartitionFeatureFlag.all,
        sha: aFiscalCodeHash
      });
      await handler(contextMock as any, input);
    } catch (e) {
      expect(true).toBe(true);
    }
  });

  it("should return Error if activity input is wrong", async () => {
    const handler = getIsUserInActiveSubsetHandler(userIsInActiveSubset_Error);

    const input = {
      enabledFeatureFlag: "wrong",
      sha: aFiscalCodeHash
    };
    var result = await handler(contextMock as any, input);
    expect(ActivityResultFailure.is(result)).toBe(true);
  });
});
