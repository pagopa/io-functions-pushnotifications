import * as df from "durable-functions";
import {
  ActivityInput as DeleteInstallationActivityInput,
  activityName as DeleteInstallationActivityName,
  ActivityResultSuccess as DeleteInstallationActivityResultSuccess
} from "../HandleNHDeleteInstallationCallActivity";
import {
  ActivityInput as IsUserInActiveSubsetActivityInput,
  activityName as IsUserInActiveSubsetActivityName,
  activityResultSuccessWithValue as isUserInActiveSubsetActivitySuccess,
  ActivityResultSuccessWithValue as IsUserInActiveSubsetActivitySuccess
} from "../IsUserInActiveSubsetActivity";
import { getConfigOrThrow } from "../utils/config";
import * as o from "../utils/durable/orchestrators";
import { getNHLegacyConfig } from "../utils/notificationhubServicePartition";
import { getHandler } from "./handler";

const config = getConfigOrThrow();

const deleteInstallationActivity = o.callableActivity<
  DeleteInstallationActivityInput
>(DeleteInstallationActivityName, DeleteInstallationActivityResultSuccess, {
  ...new df.RetryOptions(5000, config.RETRY_ATTEMPT_NUMBER),
  backoffCoefficient: 1.5
});

const isUserInActiveTestSubsetActivity = o.callableActivity<
  IsUserInActiveSubsetActivityInput,
  IsUserInActiveSubsetActivitySuccess
>(IsUserInActiveSubsetActivityName, isUserInActiveSubsetActivitySuccess, {
  ...new df.RetryOptions(5000, config.RETRY_ATTEMPT_NUMBER),
  backoffCoefficient: 1.5
});

const legacyNotificationHubConfig = getNHLegacyConfig(config);

const handler = getHandler({
  deleteInstallationActivity,
  isUserInActiveTestSubsetActivity,
  legacyNotificationHubConfig
});
const orchestrator = df.orchestrator(handler);

export default orchestrator;
