import * as df from "durable-functions";
import * as o from "../utils/durable/orchestrators";

import { getConfigOrThrow } from "../utils/config";

import {
  ActivityBodyImpl as CreateOrUpdateActivityBodyImpl,
  activityName as CreateOrUpdateActivityName,
  ActivityResultSuccess as CreateOrUpdateActivityResultSuccess
} from "../HandleNHCreateOrUpdateInstallationCallActivity";
import { getNHLegacyConfig } from "../utils/notificationhubServicePartition";
import { getHandler } from "./handler";

const config = getConfigOrThrow();

const createOrUpdateActivity = o.callableActivity<
  CreateOrUpdateActivityBodyImpl
>(CreateOrUpdateActivityName, CreateOrUpdateActivityResultSuccess, {
  ...new df.RetryOptions(5000, config.RETRY_ATTEMPT_NUMBER),
  backoffCoefficient: 1.5
});

const notificationHubConfig = getNHLegacyConfig(config);

const handler = getHandler({ createOrUpdateActivity, notificationHubConfig });

const orchestrator = df.orchestrator(handler);

export default orchestrator;
