import * as df from "durable-functions";
import { getConfigOrThrow } from "../utils/config";
import { getHandler } from "./handler";

const { RETRY_ATTEMPT_NUMBER } = getConfigOrThrow();
const handler = getHandler({ RETRY_ATTEMPT_NUMBER });
const orchestrator = df.orchestrator(handler);

export default orchestrator;
