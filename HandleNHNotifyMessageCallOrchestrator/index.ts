import * as df from "durable-functions";
import { getConfigOrThrow } from "../utils/config";
import { callableActivity } from "../utils/durable/orchestrators";
import { getNHLegacyConfig } from "../utils/notificationhubServicePartition";
import {
  ActivityInput as NotifyMessageActivityInput,
  activityName as NotifyMessageActivityName,
  ActivityResultSuccess as NotifyMessageActivityResultSuccess
} from "../HandleNHNotifyMessageCallActivity";
import {
  ActivityInput as IsUserInActiveSubsetActivityInput,
  activityName as IsUserInActiveSubsetActivityName,
  ActivityResultSuccessWithValue as IsUserInActiveSubsetActivitySuccess,
  activityResultSuccessWithValue as isUserInActiveSubsetActivitySuccess
} from "../IsUserInActiveSubsetActivity";
import { getHandler } from "./handler";

const config = getConfigOrThrow();
const legacyNotificationHubConfig = getNHLegacyConfig(config);

const notifyMessageActivity = callableActivity<NotifyMessageActivityInput>(
  NotifyMessageActivityName,
  NotifyMessageActivityResultSuccess,
  {
    ...new df.RetryOptions(5000, config.RETRY_ATTEMPT_NUMBER),
    backoffCoefficient: 1.5
  }
);

const isUserInActiveTestSubsetActivity = callableActivity<
  IsUserInActiveSubsetActivityInput,
  IsUserInActiveSubsetActivitySuccess
>(IsUserInActiveSubsetActivityName, isUserInActiveSubsetActivitySuccess, {
  ...new df.RetryOptions(5000, config.RETRY_ATTEMPT_NUMBER),
  backoffCoefficient: 1.5
});

const handler = getHandler({
  isUserInActiveTestSubsetActivity,
  legacyNotificationHubConfig,
  notifyMessageActivity
});
const orchestrator = df.orchestrator(handler);

export default orchestrator;
