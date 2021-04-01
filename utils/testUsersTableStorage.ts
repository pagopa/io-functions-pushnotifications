import { TableQuery, TableService } from "azure-storage";
import { toError } from "fp-ts/lib/Either";
import { TaskEither, tryCatch } from "fp-ts/lib/TaskEither";
import { InstallationId } from "../generated/notifications/InstallationId";

const tryUserExists = (
  tableService: TableService,
  tableName: string,
  sha: InstallationId
): Promise<boolean> =>
  new Promise((resolve, reject) => {
    const query = new TableQuery().where("RowKey eq ?", sha);

    tableService.queryEntities(
      tableName,
      query,
      null,
      (error, result, response) => {
        if (response.isSuccessful) {
          resolve(result.entries.length > 0);
        } else {
          reject(error);
        }
      }
    );
  });

/**
 * Returns a paged query function for a certain query on a storage table
 */
export const getIsUserATestUser = (
  tableService: TableService,
  tableName: string
) => (sha: InstallationId): TaskEither<Error, boolean> =>
  tryCatch(() => tryUserExists(tableService, tableName, sha), toError);
