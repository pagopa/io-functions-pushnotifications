import { createTableService } from "azure-storage";

import { getIsUserATestUser } from "../utils/checkTestUsers";
import { getConfigOrThrow } from "../utils/config";
import { getIsInActiveSubset } from "../utils/featureFlags";

import {
  ActivityInput,
  ActivitySuccessWithValue,
  getIsUserInActiveSubsetHandler
} from "./handler";

const config = getConfigOrThrow();

const tableService = createTableService(
  config.BETA_USERS_STORAGE_CONNECTION_STRING
);

const activityFunction = getIsUserInActiveSubsetHandler(
  getIsInActiveSubset(
    getIsUserATestUser(tableService, config.BETA_USERS_TABLE_NAME)
  )
);

export { ActivityInput, ActivitySuccessWithValue };

export const activityName = "IsUserInActiveSubsetActivity";

export default activityFunction;
