import { createTableService } from "azure-storage";
import { getConfigOrThrow } from "../utils/config";
import { getIsInActiveSubset } from "../utils/featureFlags";
import { getIsUserATestUser } from "../utils/testUsersTableStorage";
import { getIsUserInActiveSubsetHandler } from "./handler";

const config = getConfigOrThrow();

const tableService = createTableService(
  config.NOTIFICATIONS_STORAGE_CONNECTION_STRING
);

const activityFunction = getIsUserInActiveSubsetHandler(
  getIsInActiveSubset(getIsUserATestUser(tableService))
);

export default activityFunction;
