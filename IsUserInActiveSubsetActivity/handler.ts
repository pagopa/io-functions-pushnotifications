import * as t from "io-ts";

import { Context } from "@azure/functions";
import { fromEither } from "fp-ts/lib/TaskEither";
import { errorsToReadableMessages } from "italia-ts-commons/lib/reporters";
import { enumType } from "italia-ts-commons/lib/types";
import { InstallationId } from "../generated/notifications/InstallationId";
import { ActivityResult, failure, getRetryActivity } from "../utils/activity";
import { NHPartitionFeatureFlag } from "../utils/config";
import * as featureFlags from "../utils/featureFlags";

export const ActivityInput = t.interface({
  enabledFeatureFlag: enumType<NHPartitionFeatureFlag>(
    NHPartitionFeatureFlag,
    "NHPartitionFeatureFlag"
  ),
  sha: InstallationId
});

export type ActivityInput = t.TypeOf<typeof ActivityInput>;

export const ActivitySuccessWithValue = t.interface({
  kind: t.literal("SUCCESS"),
  value: t.boolean
});

export type ActivitySuccessWithValue = t.Type<typeof ActivitySuccessWithValue>;

export function errorsToError(errors: t.Errors): Error {
  return new Error(errorsToReadableMessages(errors).join(" / "));
}

export const successWithValue = (value: boolean) =>
  ActivitySuccessWithValue.encode({
    kind: "SUCCESS",
    value
  });

export const getIsUserInActiveSubsetHandler = (
  isInActiveSubset: ReturnType<typeof featureFlags.getIsInActiveSubset>,
  logPrefix: string = "IsUserInActiveSubset"
) => (context: Context, input: unknown): Promise<ActivityResult> => {
  const fail = failure(context, logPrefix);
  const retryActivity = getRetryActivity(context, logPrefix);

  return fromEither(ActivityInput.decode(input))
    .mapLeft(errs => fail(errorsToError(errs)))
    .chain(({ enabledFeatureFlag, sha }) =>
      isInActiveSubset(enabledFeatureFlag, sha).bimap(
        e => retryActivity(e),
        res => successWithValue(res)
      )
    )
    .fold<ActivityResult>(t.identity, t.identity)
    .run();
};
