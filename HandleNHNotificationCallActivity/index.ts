import { initTelemetryClient } from "../utils/appinsights";
import { getConfigOrThrow } from "../utils/config";
import { getCallNHServiceActivityHandler } from "./handler";

const config = getConfigOrThrow();
const telemetryClient = initTelemetryClient(config);

const activityFunctionHandler = getCallNHServiceActivityHandler(
  telemetryClient
);

export default activityFunctionHandler;
