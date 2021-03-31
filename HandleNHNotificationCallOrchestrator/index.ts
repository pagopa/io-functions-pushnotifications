import { TelemetryClient } from "applicationinsights";
import * as df from "durable-functions";
import { initTelemetryClient } from "../utils/appinsights";
import { getConfigOrThrow } from "../utils/config";
import { getHandler } from "./handler";

const config = getConfigOrThrow();

const ai = initTelemetryClient(config) as TelemetryClient;

const handler = getHandler(config, ai);
const orchestrator = df.orchestrator(handler);

export default orchestrator;
