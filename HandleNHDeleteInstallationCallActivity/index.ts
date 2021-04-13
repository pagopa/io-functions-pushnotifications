import { createActivity } from "../utils/durable/activities";
import { buildNHService } from "../utils/notificationhubServicePartition";
import {
  ActivityInput,
  ActivityResultSuccess,
  getActivityBody
} from "./handler";

export { ActivityInput, ActivityResultSuccess } from "./handler";
export const activityName = "HandleNHDeleteInstallationCallActivity";

const activityFunctionHandler = createActivity<ActivityInput>(
  activityName,
  ActivityInput,
  ActivityResultSuccess,
  getActivityBody(buildNHService)
);

export default activityFunctionHandler;
