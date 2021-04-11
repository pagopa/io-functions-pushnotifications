import { taskEither } from "fp-ts/lib/TaskEither";
import * as t from "io-ts";

import { errorsToReadableMessages } from "italia-ts-commons/lib/reporters";
import { InstallationId } from "../generated/notifications/InstallationId";

import { NHPartitionFeatureFlag } from "../utils/config";
import {
  ActivityBody,
  ActivityResultFailure
} from "../utils/durable/activities";
import * as featureFlags from "../utils/featureFlags";

export const ActivityInput = t.interface({
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
  ActivityResultSuccessWithValue,
  ActivityResultFailure
>;

export function errorsToError(errors: t.Errors): Error {
  return new Error(errorsToReadableMessages(errors).join(" / "));
}

export const successWithValue = (value: boolean) =>
  activityResultSuccessWithValue.encode({
    kind: "SUCCESS",
    value
  });

export const getActivityBody = (param: {
  enabledFeatureFlag: NHPartitionFeatureFlag;
  isInActiveSubset: ReturnType<typeof featureFlags.getIsInActiveSubset>;
}): ActivityBodyImpl => ({ input, logger, betaTestUser }) => {
  logger.info(
    `ENABLED_FF=${param.enabledFeatureFlag}|INSTALLATION_ID=${input.installationId}`
  );

  return taskEither.of(
    successWithValue(
      param.isInActiveSubset(
        param.enabledFeatureFlag,
        input.installationId,
        betaTestUser
      )
    )
  );
};
