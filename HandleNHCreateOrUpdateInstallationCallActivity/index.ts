import { RetryOptions } from "durable-functions";

import { createActivity } from "../utils/durable/activities";
import * as o from "../utils/durable/orchestrators";
import { buildNHClient } from "../utils/notificationhubServicePartition";
import {
  ActivityInput,
  ActivityResultSuccess,
  getActivityBody
} from "./handler";

export { ActivityInput, ActivityResultSuccess } from "./handler";

export const activityName = "HandleNHCreateOrUpdateInstallationCallActivity";

/**
 * Build a `CreateOrUpdateActivity` to be called by an Orchestrator
 *
 * @param retryOptions the options used to call a retry
 * @returns A callable `CreateOrUpdateActivity`
 */
export const getCallableActivity = (
  retryOptions: RetryOptions
): o.CallableActivity<ActivityInput> =>
  o.callableActivity<ActivityInput>(
    activityName,
    ActivityResultSuccess,
    retryOptions
  );

const activityFunctionHandler = createActivity(
  activityName,
  ActivityInput,
  ActivityResultSuccess,
  getActivityBody(buildNHClient)
);

export default activityFunctionHandler;
