import { InstallationId } from "../generated/notifications/InstallationId";

import * as checkTestUser from "./checkTestUsers";
import { NHPartitionFeatureFlag } from "./config";
import { assertNever } from "./types";

/**
 *
 * @param enabledFeatureFlag The feature flag currntly enabled
 * @param sha the installation id of the user
 * @param betaUsersTable the betaUserTable
 * @returns `true` if the user is enabled for the new feature, `false` otherwise
 */
export const getIsInActiveSubset = (
  isUserATestUser: ReturnType<typeof checkTestUser.getIsUserATestUser>
) => (
  enabledFeatureFlag: NHPartitionFeatureFlag,
  sha: InstallationId,
  betaUsersTable: ReadonlyArray<{ RowKey: string }>
): boolean => {
  switch (enabledFeatureFlag) {
    case NHPartitionFeatureFlag.all:
      return true;

    case NHPartitionFeatureFlag.beta:
      return isUserATestUser(betaUsersTable, sha);

    case NHPartitionFeatureFlag.canary:
      // Todo
      return false;

    case NHPartitionFeatureFlag.none:
      return false;

    default:
      assertNever(enabledFeatureFlag);
  }
};
