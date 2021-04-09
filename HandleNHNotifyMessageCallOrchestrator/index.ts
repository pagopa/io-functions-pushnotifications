import * as df from "durable-functions";
import { getConfigOrThrow } from "../utils/config";
import { callableActivity } from "../utils/durable/orchestrators";
import { getNHLegacyConfig } from "../utils/notificationhubServicePartition";
import { getHandler } from "./handler";

import {
  ActivityBodyImpl as NotifyMessageActivityBodyImpl,
  activityName as NotifyMessageActivityName,
  ActivityResultSuccess as NotifyMessageActivityResultSuccess
} from "../HandleNHNotifyMessageCallActivity";

const config = getConfigOrThrow();
const legacyNotificationHubConfig = getNHLegacyConfig(config);

const notifyMessageActivity = callableActivity<NotifyMessageActivityBodyImpl>(
  NotifyMessageActivityName,
  NotifyMessageActivityResultSuccess,
  {
    ...new df.RetryOptions(5000, config.RETRY_ATTEMPT_NUMBER),
    backoffCoefficient: 1.5
  }
);

const handler = getHandler({
  legacyNotificationHubConfig,
  notifyMessageActivity
});
const orchestrator = df.orchestrator(handler);

export default orchestrator;
