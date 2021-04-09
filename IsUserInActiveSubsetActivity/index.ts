import { createTableService } from "azure-storage";

import { getIsUserATestUser } from "../utils/checkTestUsers";
import { getConfigOrThrow } from "../utils/config";
import { createActivity } from "../utils/durable/activities";
import { getIsInActiveSubset } from "../utils/featureFlags";

import {
  ActivityBodyImpl,
  ActivityInput,
  activityResultSuccessWithValue,
  ActivityResultSuccessWithValue,
  getActivityBody
} from "./handler";

const config = getConfigOrThrow();

const tableService = createTableService(
  config.BETA_USERS_STORAGE_CONNECTION_STRING
);

export {
  ActivityBodyImpl,
  ActivityInput,
  ActivityResultSuccessWithValue,
  activityResultSuccessWithValue
};

export const activityName = "IsUserInActiveSubsetActivity";

const activityFunction = getActivityBody(
  getIsInActiveSubset(
    getIsUserATestUser(tableService, config.BETA_USERS_TABLE_NAME)
  )
);

const activityFunctionHandler = createActivity(
  activityName,
  ActivityInput,
  activityResultSuccessWithValue,
  activityFunction
);

export default activityFunctionHandler;
