import { createActivity } from "../utils/durable/activities";
import { buildNHService } from "../utils/notificationhubServicePartition";
import {
  ActivityBodyImpl,
  ActivityInput,
  ActivityResultSuccess,
  getActivityBody
} from "./handler";

export {
  ActivityBodyImpl,
  ActivityInput,
  ActivityResultSuccess
} from "./handler";
export const activityName = "HandleNHDeleteInstallationCallActivity";

const activityFunctionHandler = createActivity<ActivityBodyImpl>(
  activityName,
  ActivityInput,
  ActivityResultSuccess,
  getActivityBody(buildNHService)
);

export default activityFunctionHandler;
