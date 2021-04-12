import { InstallationId } from "../generated/notifications/InstallationId";

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
  isUserATestUser: ReturnType<typeof getIsUserABetaTestUser>
) => (
  enabledFeatureFlag: NHPartitionFeatureFlag,
  sha: InstallationId,
  betaUsersTable: ReadonlyArray<{ RowKey: string }>
): boolean => {
  switch (enabledFeatureFlag) {
    case "all":
      return true;

    case "beta":
      return isUserATestUser(betaUsersTable, sha);

    case "canary":
      // Todo
      return false;

    case "none":
      return false;

    default:
      assertNever(enabledFeatureFlag);
  }
};

/**
 * @param betaUsersTable the table where to search into
 * @param sha the value to search
 * @returns A function that return `true` if user if sha is present in table, false otherwise
 */
export const getIsUserABetaTestUser = () => (
  betaUsersTable: ReadonlyArray<{ RowKey: string }>,
  sha: InstallationId
): boolean => betaUsersTable.filter(u => u.RowKey === sha).length > 0;
