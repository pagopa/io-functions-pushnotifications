import { InstallationId } from "../generated/notifications/InstallationId";
import { NHPartitionFeatureFlag } from "./config";

/**
 *
 * @param enabledFeatureFlag The feature flag currntly enabled
 * @param sha the installation id of the user
 * @returns `true` if the user is enabled for the new feature, `false` otherwise
 */
export function isInActiveSubset(
  enabledFeatureFlag: NHPartitionFeatureFlag,
  // tslint:disable-next-line: no-unused-variable
  sha: InstallationId
): boolean {
  switch (enabledFeatureFlag) {
    case NHPartitionFeatureFlag.all:
      return true;

    case NHPartitionFeatureFlag.beta:
      // Todo
      return false;

    case NHPartitionFeatureFlag.canary:
      // Todo
      return false;

    case NHPartitionFeatureFlag.none:
    default:
      return false;
  }
}
