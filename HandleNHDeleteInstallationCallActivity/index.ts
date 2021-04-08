import { createActivity } from "../utils/durable/activities";
import { activityBody, ActivityInput, ActivityResultSuccess } from "./handler";

export {
  ActivityBodyImpl,
  ActivityInput,
  ActivityResultSuccess
} from "./handler";
export const activityName = "HandleNHDeleteInstallationCallActivity";

const activityFunctionHandler = createActivity(
  activityName,
  ActivityInput,
  ActivityResultSuccess,
  activityBody
);

export default activityFunctionHandler;
