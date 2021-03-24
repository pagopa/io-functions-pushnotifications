import * as notificationhubServicePartition from "../utils/notificationhubServicePartition";
import { getCallNHDeleteInstallationActivityHandler } from "./handler";

const activityFunctionHandler = getCallNHDeleteInstallationActivityHandler(
  notificationhubServicePartition
);

export default activityFunctionHandler;
