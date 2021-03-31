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

const aFiscalCodeHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" as NonEmptyString;

const userIsInActiveSubset: ReturnType<typeof getIsInActiveSubset> = _ =>
  fromEither(right(true));

const userIsNotInActiveSubset: ReturnType<typeof getIsInActiveSubset> = _ =>
  fromEither(right(false));

const userIsInActiveSubset_Error: ReturnType<typeof getIsInActiveSubset> = _ =>
  fromEither(left(new Error("Test Error")));

describe("IsUserInActiveSubsetActivity", () => {
  it("should return true", async () => {
    const handler = getIsUserInActiveSubsetHandler(userIsInActiveSubset);

    const input = ActivityInput.encode({
      enabledFeatureFlag: NHPartitionFeatureFlag.all,
      sha: aFiscalCodeHash
    });
    var result = await handler(contextMock as any, input);
    expect(result.kind).toBe("SUCCESS");

    expect((result as any).value).toBeTruthy();
  });
  it("should return false", async () => {
    const handler = getIsUserInActiveSubsetHandler(userIsNotInActiveSubset);

    const input = ActivityInput.encode({
      enabledFeatureFlag: NHPartitionFeatureFlag.all,
      sha: aFiscalCodeHash
    });
    var result = await handler(contextMock as any, input);
    expect(result.kind).toBe("SUCCESS");

    expect((result as any).value).toBeFalsy();
  });

  it("should throw Exception if an error occurred in function", async () => {
    const handler = getIsUserInActiveSubsetHandler(userIsInActiveSubset_Error);

    expect.assertions(1);
    try {
      const input = ActivityInput.encode({
        enabledFeatureFlag: NHPartitionFeatureFlag.all,
        sha: aFiscalCodeHash
      });
      var result = await handler(contextMock as any, input);
    } catch (e) {
      expect(true).toBeTruthy();
    }
  });

  it("should return Error if input is wrong", async () => {
    const handler = getIsUserInActiveSubsetHandler(userIsInActiveSubset_Error);

    const input = {
      enabledFeatureFlag: "wrong",
      sha: aFiscalCodeHash
    };
    var result = await handler(contextMock as any, input);
    expect(result.kind).toBe("FAILURE");
  });
});
