import { initTelemetryClient } from "../utils/appinsights";
import { getConfigOrThrow } from "../utils/config";

import { getCallNHNotifyMessageActivityHandler } from "./handler";

const config = getConfigOrThrow();
const telemetryClient = initTelemetryClient(config);

const activityFunctionHandler = getCallNHNotifyMessageActivityHandler(
  telemetryClient
);

export default activityFunctionHandler;
