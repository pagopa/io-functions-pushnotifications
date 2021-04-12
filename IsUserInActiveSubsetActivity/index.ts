import { getConfigOrThrow } from "../utils/config";
import { createActivity } from "../utils/durable/activities";
import { getIsInActiveSubset, getIsUserATestUser } from "../utils/featureFlags";

import {
  ActivityBodyImpl,
  ActivityInput,
  ActivityResultSuccessWithValue,
  activityResultSuccessWithValue,
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
