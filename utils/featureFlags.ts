import { right } from "fp-ts/lib/Either";
import { fromEither, TaskEither } from "fp-ts/lib/TaskEither";
import { InstallationId } from "../generated/notifications/InstallationId";
import { NHPartitionFeatureFlag } from "./config";

/**
 *
 * @param enabledFeatureFlag The feature flag currntly enabled
 * @param sha the installation id of the user
 * @returns `true` if the user is enabled for the new feature, `false` otherwise
 */
export const getIsInActiveSubset = (
  isUserATestUser: (InstallationId) => TaskEither<Error, boolean>
) => (
  enabledFeatureFlag: NHPartitionFeatureFlag,
  sha: InstallationId
): TaskEither<Error, boolean> => {
  switch (enabledFeatureFlag) {
    case NHPartitionFeatureFlag.all:
      return fromEither(right(true));

    case NHPartitionFeatureFlag.beta:
      return isUserATestUser(sha);

    case NHPartitionFeatureFlag.canary:
      // Todo
      return taskEither.of(false);

    case NHPartitionFeatureFlag.none:
    default:
      return taskEither.of(false);
  }
};
