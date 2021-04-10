import { toString } from "fp-ts/lib/function";
import { taskEither, TaskEither } from "fp-ts/lib/TaskEither";
import { InstallationId } from "../generated/notifications/InstallationId";
import { NHPartitionFeatureFlag } from "./config";

export function assertExhaustive(
  value: never,
  message: string = `Reached unexpected case in "enabledFeatureFlag" exhaustive switch ${toString(
    value
  )}`
): never {
  throw new Error(message);
}

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
      return taskEither.of(true);

    case NHPartitionFeatureFlag.beta:
      return isUserATestUser(sha);

    case NHPartitionFeatureFlag.canary:
      // Todo
      return taskEither.of(false);

    case NHPartitionFeatureFlag.none:
      return taskEither.of(false);

    default:
      assertExhaustive(enabledFeatureFlag);
  }
};
