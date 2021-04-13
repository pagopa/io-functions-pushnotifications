import * as df from "durable-functions";
import {
  ActivityBodyImpl as DeleteInstallationActivityBodyImpl,
  activityName as DeleteInstallationActivityName,
  ActivityResultSuccess as DeleteInstallationActivityResultSuccess
} from "../HandleNHDeleteInstallationCallActivity";
import { getConfigOrThrow } from "../utils/config";
import * as o from "../utils/durable/orchestrators";
import { getNHLegacyConfig } from "../utils/notificationhubServicePartition";
import { getHandler } from "./handler";

const config = getConfigOrThrow();

const deleteInstallationActivity = o.callableActivity<
  DeleteInstallationActivityBodyImpl
>(DeleteInstallationActivityName, DeleteInstallationActivityResultSuccess, {
  ...new df.RetryOptions(5000, config.RETRY_ATTEMPT_NUMBER),
  backoffCoefficient: 1.5
});

const legacyNotificationHubConfig = getNHLegacyConfig(config);

const handler = getHandler({
  deleteInstallationActivity,
  legacyNotificationHubConfig
});
const orchestrator = df.orchestrator(handler);

export default orchestrator;
