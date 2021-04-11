import { InstallationId } from "../generated/notifications/InstallationId";

/**
 * @param betaUsersTable the table where to search into
 * @param sha the value to search
 * @returns `true` if user if sha is present in table, false otherwise
 */
export const getIsUserATestUser = () => (
  betaUsersTable: ReadonlyArray<{ RowKey: string }>,
  sha: InstallationId
): boolean => betaUsersTable.filter(u => u.RowKey === sha).length > 0;
