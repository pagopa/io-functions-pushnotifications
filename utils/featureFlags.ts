import { pipe } from "fp-ts/lib/function";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { InstallationId } from "../generated/notifications/InstallationId";
import { NHPartitionFeatureFlag } from "./config";

/**
 *
 * @param enabledFeatureFlag The feature flag currntly enabled
 * @param sha the installation id of the user
 * @param betaUsersTable the betaUserTable
 * @returns `true` if the user is enabled for the new feature, `false` otherwise
 */
export const getIsInActiveSubset = (
  isUserATestUser: ReturnType<typeof getIsUserABetaTestUser>,
  isUserACanaryUser: ReturnType<typeof getIsUserACanaryTestUser>
) => (
  enabledFeatureFlag: NHPartitionFeatureFlag,
  sha: InstallationId,
  betaUsersTable: ReadonlyArray<{ readonly RowKey: string }>
): boolean => {
  // eslint-disable-next-line default-case
  switch (enabledFeatureFlag) {
    case "all":
      return true;
    case "beta":
      return isUserATestUser(betaUsersTable, sha);
    case "canary":
      return isUserACanaryUser(sha) || isUserATestUser(betaUsersTable, sha);
    case "none":
      return false;
  }
};

/**
 * @param betaUsersTable the table where to search into
 * @param sha the value to search
 * @returns A function that return `true` if user if sha is present in table, false otherwise
 */
export const getIsUserABetaTestUser = () => (
  betaUsersTable: ReadonlyArray<{ readonly RowKey: string }>,
  sha: InstallationId
): boolean => betaUsersTable.filter(u => u.RowKey === sha).length > 0;

/**
 *
 * @param regex The regex to use
 * @returns
 */
export const getIsUserACanaryTestUser = (
  regex: string
): ((sha: InstallationId) => boolean) => {
  const regExp = new RegExp(regex);

  return (sha: InstallationId): boolean => regExp.test(sha);
};

export const getDefaultFFEvaluator = (
  CANARY_USERS_REGEX: NonEmptyString,
  betaUsersTable: ReadonlyArray<{ readonly RowKey: string }>,
  enabledFeatureFlag: NHPartitionFeatureFlag
) => (sha: InstallationId): boolean =>
  pipe(
    getIsInActiveSubset(
      getIsUserABetaTestUser(),
      getIsUserACanaryTestUser(CANARY_USERS_REGEX)
    ),
    isInActiveSubset =>
      isInActiveSubset(enabledFeatureFlag, sha, betaUsersTable)
  );
export type DefaultFFEvaluator = ReturnType<typeof getDefaultFFEvaluator>;
