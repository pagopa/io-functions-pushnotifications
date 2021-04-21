import { TelemetryClient } from "applicationinsights";
import * as df from "durable-functions";
import * as o from "../utils/durable/orchestrators";

import { getConfigOrThrow } from "../utils/config";

import {
  ActivityInput as CreateOrUpdateActivityInput,
  activityName as CreateOrUpdateActivityName,
  ActivityResultSuccess as CreateOrUpdateActivityResultSuccess
} from "../HandleNHCreateOrUpdateInstallationCallActivity";
import {
  ActivityInput as IsUserInActiveSubsetActivityInput,
  activityName as IsUserInActiveSubsetActivityName,
  activityResultSuccessWithValue as isUserInActiveSubsetActivitySuccess,
  ActivityResultSuccessWithValue as IsUserInActiveSubsetResultSuccess
} from "../IsUserInActiveSubsetActivity";

import { initTelemetryClient } from "../utils/appinsights";
import { getNHLegacyConfig } from "../utils/notificationhubServicePartition";

import { getHandler } from "./handler";

const config = getConfigOrThrow();
const telemetryClient = initTelemetryClient(config) as TelemetryClient;

const createOrUpdateActivity = o.callableActivity<CreateOrUpdateActivityInput>(
  CreateOrUpdateActivityName,
  CreateOrUpdateActivityResultSuccess,
  {
    ...new df.RetryOptions(5000, config.RETRY_ATTEMPT_NUMBER),
    backoffCoefficient: 1.5
  }
);

const isUserInActiveTestSubsetActivity = o.callableActivity<
  IsUserInActiveSubsetActivityInput,
  IsUserInActiveSubsetResultSuccess
>(IsUserInActiveSubsetActivityName, isUserInActiveSubsetActivitySuccess, {
  ...new df.RetryOptions(5000, config.RETRY_ATTEMPT_NUMBER),
  backoffCoefficient: 1.5
});

const notificationHubConfig = getNHLegacyConfig(config);

const handler = getHandler({
  createOrUpdateActivity,
  featureFlag: config.NH_PARTITION_FEATURE_FLAG,
  isUserInActiveTestSubsetActivity,
  notificationHubConfig,
  telemetryClient
});

const orchestrator = df.orchestrator(handler);

export default orchestrator;
