import * as df from "durable-functions";
import * as o from "../utils/durable/orchestrators";

import { getConfigOrThrow } from "../utils/config";
import { getHandler } from "./handler";

import {
  ActivityBodyImpl as DeleteActivityBodyImpl,
  activityName as DeleteActivityName,
  ActivityResultSuccess as DeleteActivityResultSuccess
} from "../HandleNHDeleteInstallationCallActivity";
import { getNHLegacyConfig } from "../utils/notificationhubServicePartition";

const config = getConfigOrThrow();

const deleteActivity = o.callableActivity<DeleteActivityBodyImpl>(
  DeleteActivityName,
  DeleteActivityResultSuccess,
  {
    ...new df.RetryOptions(5000, config.RETRY_ATTEMPT_NUMBER),
    backoffCoefficient: 1.5
  }
);

const notificationHubConfig = getNHLegacyConfig(config);

const handler = getHandler({ deleteActivity, notificationHubConfig });

const orchestrator = df.orchestrator(handler);

export default orchestrator;
