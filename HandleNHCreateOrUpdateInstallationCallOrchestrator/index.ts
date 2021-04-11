import * as df from "durable-functions";
import * as o from "../utils/durable/orchestrators";

import { getConfigOrThrow } from "../utils/config";
import { getHandler } from "./handler";

import {
  ActivityBodyImpl as CreateOrUpdateActivityBodyImpl,
  activityName as CreateOrUpdateActivityName,
  ActivityResultSuccess as CreateOrUpdateActivityResultSuccess
} from "../HandleNHCreateOrUpdateInstallationCallActivity";
import {
  ActivityBodyImpl as IsUserInActiveSubsetActivityBodyImpl,
  activityName as IsUserInActiveSubsetActivityName,
  activityResultSuccessWithValue as isUserInActiveSubsetActivitySuccess
} from "../IsUserInActiveSubsetActivity";

import { getNHLegacyConfig } from "../utils/notificationhubServicePartition";

const config = getConfigOrThrow();

const createOrUpdateActivity = o.callableActivity<
  CreateOrUpdateActivityBodyImpl
>(CreateOrUpdateActivityName, CreateOrUpdateActivityResultSuccess, {
  ...new df.RetryOptions(5000, config.RETRY_ATTEMPT_NUMBER),
  backoffCoefficient: 1.5
});

const isUserInActiveTestSubsetActivity = o.callableActivity<
  IsUserInActiveSubsetActivityBodyImpl
>(IsUserInActiveSubsetActivityName, isUserInActiveSubsetActivitySuccess, {
  ...new df.RetryOptions(5000, config.RETRY_ATTEMPT_NUMBER),
  backoffCoefficient: 1.5
});

const notificationHubConfig = getNHLegacyConfig(config);

const handler = getHandler({
  createOrUpdateActivity,
  isUserInActiveTestSubsetActivity,
  notificationHubConfig
});

const orchestrator = df.orchestrator(handler);

export default orchestrator;
