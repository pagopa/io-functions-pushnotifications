import { RetryOptions } from "durable-functions";

import * as o from "../utils/durable/orchestrators";

import { initTelemetryClient } from "../utils/appinsights";
import { getConfigOrThrow } from "../utils/config";
import { createActivity } from "../utils/durable/activities";
import { buildNHService } from "../utils/notificationhubServicePartition";

import {
  ActivityInput,
  ActivityResultSuccess,
  getActivityBody
} from "./handler";

export { ActivityInput, ActivityResultSuccess } from "./handler";
export const activityName = "HandleNHNotifyMessageCallActivity";

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

const config = getConfigOrThrow();
const telemetryClient = initTelemetryClient(config);

const activityFunctionHandler = createActivity(
  activityName,
  ActivityInput,
  ActivityResultSuccess,
  getActivityBody(
    telemetryClient,
    buildNHService,
    config.FISCAL_CODE_NOTIFICATION_BLACKLIST
  )
);

export default activityFunctionHandler;
