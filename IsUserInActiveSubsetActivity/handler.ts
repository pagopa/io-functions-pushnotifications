import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import * as t from "io-ts";

import { errorsToReadableMessages } from "@pagopa/ts-commons/lib/reporters";
import { InstallationId } from "../generated/notifications/InstallationId";

import { NHPartitionFeatureFlag } from "../utils/config";
import { ActivityBody } from "../utils/durable/activities";
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

export const errorsToError = (errors: t.Errors): Error =>
  new Error(errorsToReadableMessages(errors).join(" / "));

export const successWithValue = (
  value: boolean
): ActivityResultSuccessWithValue =>
  activityResultSuccessWithValue.encode({
    kind: "SUCCESS",
    value
  });

export const getActivityBody = (param: {
  readonly enabledFeatureFlag: NHPartitionFeatureFlag;
  readonly isInActiveSubset: ReturnType<
    typeof featureFlags.getIsInActiveSubset
  >;
}) => ({
  context,
  input,
  logger
}: Parameters<
  ActivityBody<ActivityInput, ActivityResultSuccessWithValue>
>[0]): ReturnType<
  ActivityBody<ActivityInput, ActivityResultSuccessWithValue>
> => {
  logger.info(
    `ENABLED_FF=${param.enabledFeatureFlag}|INSTALLATION_ID=${input.installationId}`
  );

  return pipe(
    param.isInActiveSubset(
      param.enabledFeatureFlag,
      input.installationId,
      context.bindings.betaTestUser
    ),
    successWithValue,
    TE.of
  );
};
