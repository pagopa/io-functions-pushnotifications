import { createActivity } from "../utils/durable/activities";
import { buildNHService } from "../utils/notificationhubServicePartition";
import {
  ActivityInput,
  ActivityResultSuccess,
  getActivityBody
} from "./handler";

export {
  CreateOrUpdateActivityInput as ActivityInput,
  ActivityResultSuccess
} from "./handler";
export const activityName = "HandleNHCreateOrUpdateInstallationCallActivity";

const activityFunctionHandler = createActivity(
  activityName,
  ActivityInput,
  ActivityResultSuccess,
  getActivityBody(buildNHService)
);

export default activityFunctionHandler;
