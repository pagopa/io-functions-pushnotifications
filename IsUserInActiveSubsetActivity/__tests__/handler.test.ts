import { NHPartitionFeatureFlag } from "../../utils/config";
import { getIsInActiveSubset } from "../../utils/featureFlags";

import { context as contextMock } from "../../__mocks__/durable-functions";

import { activityResultSuccessWithValue, getActivityBody } from "../handler";
import { NonEmptyString } from "italia-ts-commons/lib/strings";
import { ActivityResult } from "../../utils/durable/activities";
import {
  ActivityLogger,
  createLogger
} from "../../utils/durable/activities/log";
import { identity } from "fp-ts/lib/function";

const aFiscalCodeHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" as NonEmptyString;

const mockLogger: ActivityLogger = createLogger(contextMock as any, "");

const userIsInActiveSubset: ReturnType<typeof getIsInActiveSubset> = _ => true;

const userIsNotInActiveSubset: ReturnType<typeof getIsInActiveSubset> = _ =>
  false;

describe("IsUserInActiveSubsetActivity - Beta Test Users", () => {
  it("should return false if userIsNotInActiveSubset return true", async () => {
    const handler = getActivityBody({
      enabledFeatureFlag: NHPartitionFeatureFlag.beta,
      isInActiveSubset: userIsInActiveSubset
    });
    const input = {
      installationId: aFiscalCodeHash
    };
    const result = await handler({
      context: contextMock as any,
      input,
      logger: mockLogger
    })
      .fold<ActivityResult>(identity, identity)
      .run();

    activityResultSuccessWithValue.decode(result).fold(
      _ => fail(),
      r => expect(r.value).toBe(true)
    );
  });

  it("should return false if userIsNotInActiveSubset return false", async () => {
    const handler = getActivityBody({
      enabledFeatureFlag: NHPartitionFeatureFlag.beta,
      isInActiveSubset: userIsNotInActiveSubset
    });
    const input = {
      installationId: aFiscalCodeHash
    };
    const result = await handler({
      context: contextMock as any,
      input,
      logger: mockLogger
    })
      .fold<ActivityResult>(identity, identity)
      .run();

    activityResultSuccessWithValue.decode(result).fold(
      _ => fail(),
      r => expect(r.value).toBe(false)
    );
  });
});
