import { TelemetryClient } from "applicationinsights";
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

const config = getConfigOrThrow();
const telemetryClient = initTelemetryClient(config) as TelemetryClient;

const activityFunctionHandler = createActivity(
  activityName,
  ActivityInput,
  ActivityResultSuccess,
  getActivityBody(telemetryClient, buildNHService)
);

export default activityFunctionHandler;
