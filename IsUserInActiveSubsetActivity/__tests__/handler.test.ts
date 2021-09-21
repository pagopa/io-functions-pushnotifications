import { getIsInActiveSubset } from "../../utils/featureFlags";

import { context as contextMock } from "../../__mocks__/durable-functions";

import { activityResultSuccessWithValue, getActivityBody } from "../handler";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { ActivityResult } from "../../utils/durable/activities";
import {
  ActivityLogger,
  createLogger
} from "../../utils/durable/activities/log";
import { identity, pipe } from "fp-ts/lib/function";

import * as TE from "fp-ts/lib/TaskEither";
import * as E from "fp-ts/lib/Either";

const aFiscalCodeHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" as NonEmptyString;

const mockLogger: ActivityLogger = createLogger(contextMock as any, "");

const userIsInActiveSubset: ReturnType<typeof getIsInActiveSubset> = _ => true;

const userIsNotInActiveSubset: ReturnType<typeof getIsInActiveSubset> = _ =>
  false;

describe("IsUserInActiveSubsetActivity - Beta Test Users", () => {
  it("should return false if userIsNotInActiveSubset return true", async () => {
    const handler = getActivityBody({
      enabledFeatureFlag: "beta",
      isInActiveSubset: userIsInActiveSubset
    });
    const input = {
      installationId: aFiscalCodeHash
    };
    const result = await pipe(
      {
        context: {
          ...contextMock,
          bindings: {
            betaTestUser: []
          }
        },
        input,
        logger: mockLogger
      },
      handler,
      TE.toUnion
    )();

    pipe(
      result,
      activityResultSuccessWithValue.decode,
      E.fold(
        _ => fail(),
        r => expect(r.value).toBe(true)
      )
    );
  });

  it("should return false if userIsNotInActiveSubset return false", async () => {
    const handler = getActivityBody({
      enabledFeatureFlag: "beta",
      isInActiveSubset: userIsNotInActiveSubset
    });
    const input = {
      installationId: aFiscalCodeHash
    };
    const result = await pipe(
      {
        context: {
          ...contextMock,
          bindings: {
            betaTestUser: []
          }
        },
        input,
        logger: mockLogger
      },
      handler,
      TE.toUnion
    )();

    pipe(
      result,
      activityResultSuccessWithValue.decode,
      E.fold(
        _ => fail(),
        r => expect(r.value).toBe(false)
      )
    );
  });
});
