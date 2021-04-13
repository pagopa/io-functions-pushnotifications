/**
 * Is User in Active Subset Activity implementation
 *
 * This activity is inteded to tell orchestrator whether if
 * a user is considered a test user or not (based on FF none-beta-canary-all)
 */

import { RetryOptions } from "durable-functions";

import * as o from "../utils/durable/orchestrators";
import { getConfigOrThrow } from "../utils/config";
import { createActivity } from "../utils/durable/activities";
import {
  getIsInActiveSubset,
  getIsUserABetaTestUser,
  getIsUserACanaryTestUser
} from "../utils/featureFlags";

import {
  ActivityInput,
  ActivityResultSuccessWithValue,
  activityResultSuccessWithValue,
  getActivityBody
} from "./handler";

export {
  ActivityInput,
  ActivityResultSuccessWithValue,
  activityResultSuccessWithValue
};

export const activityName = "IsUserInActiveSubsetActivity";

/**
 * Build a `IsUserInActiveSubsetActivity` to be called by an Orchestrator
 *
 * @param retryOptions the options used to call a retry
 * @returns A callable `IsUserInActiveSubsetActivity`
 */
export const getCallableActivity = (
  retryOptions: RetryOptions
): o.CallableActivity<ActivityInput, ActivityResultSuccessWithValue> =>
  o.callableActivity<ActivityInput, ActivityResultSuccessWithValue>(
    activityName,
    activityResultSuccessWithValue,
    retryOptions
  );

const config = getConfigOrThrow();

const activityFunction = getActivityBody({
  enabledFeatureFlag: config.NH_PARTITION_FEATURE_FLAG,
  isInActiveSubset: getIsInActiveSubset(
    getIsUserABetaTestUser(),
    getIsUserACanaryTestUser(config.CANARY_USERS_REGEX)
  )
});

const activityFunctionHandler = createActivity(
  activityName,
  ActivityInput,
  activityResultSuccessWithValue,
  activityFunction
);

export default activityFunctionHandler;
