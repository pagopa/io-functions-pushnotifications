﻿import * as df from "durable-functions";
import { getConfigOrThrow } from "../utils/config";
import {
  getNHLegacyConfig,
  getNotificationHubPartitionConfig
} from "../utils/notificationhubServicePartition";
import { getCallableActivity as getNotfyMessageActivityCallableActivity } from "../HandleNHNotifyMessageCallActivity";
import { getCallableActivity as getIsUserInActiveSubsetActivityCallableActivity } from "../IsUserInActiveSubsetActivity";

import { getHandler } from "./handler";

const config = getConfigOrThrow();
const legacyNotificationHubConfig = getNHLegacyConfig(config);
const notificationHubConfigPartitionChooser = getNotificationHubPartitionConfig(
  config
);
const notifyMessageActivity = getNotfyMessageActivityCallableActivity({
  ...new df.RetryOptions(5000, config.RETRY_ATTEMPT_NUMBER),
  backoffCoefficient: 1.5
});

const isUserInActiveTestSubsetActivity = getIsUserInActiveSubsetActivityCallableActivity(
  {
    ...new df.RetryOptions(5000, config.RETRY_ATTEMPT_NUMBER),
    backoffCoefficient: 1.5
  }
);

const handler = getHandler({
  isUserInActiveTestSubsetActivity,
  legacyNotificationHubConfig,
  notificationHubConfigPartitionChooser,
  notifyMessageActivity
});
const orchestrator = df.orchestrator(handler);

export default orchestrator;
