import { TableQuery, TableService } from "azure-storage";
import { InstallationId } from "../generated/notifications/InstallationId";

export const tryUserExists = (
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
