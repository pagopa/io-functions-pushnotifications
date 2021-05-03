import * as df from "durable-functions";

import { getCallableActivity as getDeleteInstallationCallableActivity } from "../HandleNHDeleteInstallationCallActivity";

import { getConfigOrThrow } from "../utils/config";
import {
  getNHLegacyConfig,
  getNotificationHubPartitionConfig
} from "../utils/notificationhubServicePartition";
import { getHandler } from "./handler";

const config = getConfigOrThrow();

const deleteInstallationActivity = getDeleteInstallationCallableActivity({
  ...new df.RetryOptions(5000, config.RETRY_ATTEMPT_NUMBER),
  backoffCoefficient: 1.5
});

const legacyNotificationHubConfig = getNHLegacyConfig(config);
const notificationHubConfigPartitionChooser = getNotificationHubPartitionConfig(
  config
);

const handler = getHandler({
  deleteInstallationActivity,
  legacyNotificationHubConfig,
  notificationHubConfigPartitionChooser
});
const orchestrator = df.orchestrator(handler);

export default orchestrator;
