import { TableService } from "azure-storage";
import { toError } from "fp-ts/lib/Either";
import { TaskEither, tryCatch } from "fp-ts/lib/TaskEither";
import { InstallationId } from "../generated/notifications/InstallationId";
import { tryUserExists } from "./testUsersTableStorage";

/**
 * Returns a paged query function for a certain query on a storage table
 */
export const getIsUserATestUser = (
  tableService: TableService,
  tableName: string
) => (sha: InstallationId): TaskEither<Error, boolean> =>
  tryCatch(() => tryUserExists(tableService, tableName, sha), toError);
