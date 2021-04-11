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

export {
  ActivityBodyImpl,
  ActivityInput,
  ActivityResultSuccessWithValue,
  activityResultSuccessWithValue
};

const config = getConfigOrThrow();

export const activityName = "IsUserInActiveSubsetActivity";

const activityFunction = getActivityBody({
  enabledFeatureFlag: config.NH_PARTITION_FEATURE_FLAG,
  isInActiveSubset: getIsInActiveSubset(getIsUserATestUser())
});

const activityFunctionHandler = createActivity(
  activityName,
  ActivityInput,
  activityResultSuccessWithValue,
  activityFunction
);

export default activityFunctionHandler;
