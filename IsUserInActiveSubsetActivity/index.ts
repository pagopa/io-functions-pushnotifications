import { createTableService } from "azure-storage";
import { getConfigOrThrow } from "../utils/config";
import { getIsInActiveSubset } from "../utils/featureFlags";
import { getIsUserATestUser } from "../utils/testUsersTableStorage";
import { getIsUserInActiveSubsetHandler } from "./handler";

const config = getConfigOrThrow();

const tableService = createTableService(
  config.BETA_USERS_STORAGE_CONNECTION_STRING
);

const activityFunction = getIsUserInActiveSubsetHandler(
  getIsInActiveSubset(
    getIsUserATestUser(tableService, config.BETA_USERS_TABLE_NAME)
  )
);

export default activityFunction;
