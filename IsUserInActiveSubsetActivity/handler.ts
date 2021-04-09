import * as t from "io-ts";

import { toString } from "fp-ts/lib/function";

import { errorsToReadableMessages } from "italia-ts-commons/lib/reporters";
import { enumType } from "italia-ts-commons/lib/types";
import { InstallationId } from "../generated/notifications/InstallationId";

import { NHPartitionFeatureFlag } from "../utils/config";
import { ActivityBody, retryActivity } from "../utils/durable/activities";
import * as featureFlags from "../utils/featureFlags";

export const ActivityInput = t.interface({
  enabledFeatureFlag: enumType<NHPartitionFeatureFlag>(
    NHPartitionFeatureFlag,
    "NHPartitionFeatureFlag"
  ),
  installationId: InstallationId
});

export type ActivityInput = t.TypeOf<typeof ActivityInput>;

export const activityResultSuccessWithValue = t.interface({
  kind: t.literal("SUCCESS"),
  value: t.boolean
});

export type ActivityResultSuccessWithValue = t.TypeOf<
  typeof activityResultSuccessWithValue
>;

export type ActivityBodyImpl = ActivityBody<
  ActivityInput,
  ActivityResultSuccessWithValue
>;

export function errorsToError(errors: t.Errors): Error {
  return new Error(errorsToReadableMessages(errors).join(" / "));
}

export const successWithValue = (value: boolean) =>
  activityResultSuccessWithValue.encode({
    kind: "SUCCESS",
    value
  });

export const getActivityBody = (
  isInActiveSubset: ReturnType<typeof featureFlags.getIsInActiveSubset>
): ActivityBodyImpl => ({ input, logger }) => {
  logger.info(
    `ENABLED_FF=${input.enabledFeatureFlag}|INSTALLATION_ID=${input.installationId}`
  );

  return isInActiveSubset(input.enabledFeatureFlag, input.installationId).bimap(
    e => retryActivity(logger, `ERROR=${toString(e)}`),
    res => successWithValue(res)
  );
};
