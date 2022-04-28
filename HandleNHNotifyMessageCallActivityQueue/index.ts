import { AzureFunction, Context } from "@azure/functions";
import { getConfigOrThrow } from "../utils/config";
import { initTelemetryClient } from "../utils/appinsights";
import {
  getNHLegacyConfig,
  getNotificationHubPartitionConfig
} from "../utils/notificationhubServicePartition";
import { handle } from "./handle";

const config = getConfigOrThrow();

const telemetryClient = initTelemetryClient(config);

const legacyNotificationHubConfig = getNHLegacyConfig(config);
const notificationHubConfigPartitionChooser = getNotificationHubPartitionConfig(
  config
);

export const index: AzureFunction = (
  context: Context,
  notifyRequest: unknown
): ReturnType<typeof handle> =>
  handle(
    notifyRequest,
    legacyNotificationHubConfig,
    notificationHubConfigPartitionChooser,
    config.FISCAL_CODE_NOTIFICATION_BLACKLIST,
    telemetryClient
  );
