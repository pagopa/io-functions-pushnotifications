import { getCallNHServiceActivityHandler } from "./handler";
import { getConfigOrThrow } from "../utils/config";
import { initTelemetryClient } from "../utils/appinsights";
import * as notificationhubServicePartition from "../utils/notificationhubServicePartition";

const config = getConfigOrThrow();
const telemetryClient = initTelemetryClient(config);

const activityFunctionHandler = getCallNHServiceActivityHandler(telemetryClient, notificationhubServicePartition);

export default activityFunctionHandler;
