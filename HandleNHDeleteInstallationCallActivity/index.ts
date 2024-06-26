/**
 * Delete Installation Activity implementation
 */

import { RetryOptions } from "durable-functions";
import { initTelemetryClient } from "../utils/appinsights";
import { getConfigOrThrow } from "../utils/config";
import { createActivity } from "../utils/durable/activities";
import * as o from "../utils/durable/orchestrators";
import { buildNHClient } from "../utils/notificationhubServicePartition";
import {
  ActivityInput,
  ActivityResultSuccess,
  getActivityBody
} from "./handler";

export { ActivityInput, ActivityResultSuccess } from "./handler";

export const activityName = "HandleNHDeleteInstallationCallActivity";

const config = getConfigOrThrow();
const telemetryClient = initTelemetryClient(config);

/**
 * Build a `HandleNHDeleteInstallationCallActivity` to be called by an Orchestrator
 *
 * @param retryOptions the options used to call a retry
 * @returns A callable `HandleNHDeleteInstallationCallActivity`
 */
export const getCallableActivity = (
  retryOptions: RetryOptions
): o.CallableActivity<ActivityInput> =>
  o.callableActivity<ActivityInput>(
    activityName,
    ActivityResultSuccess,
    retryOptions
  );

const activityFunctionHandler = createActivity<ActivityInput>(
  activityName,
  ActivityInput,
  ActivityResultSuccess,
  getActivityBody(buildNHClient, telemetryClient)
);

export default activityFunctionHandler;
