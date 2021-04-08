import { Task } from "durable-functions/lib/src/classes";
import * as t from "io-ts";

import { DeleteInstallationMessage } from "../generated/notifications/DeleteInstallationMessage";

import { ActivityBodyImpl as DeleteInstallationActivityBodyImpl } from "../HandleNHDeleteInstallationCallActivity";

import * as o from "../utils/durable/orchestrators";
import { NotificationHubConfig } from "../utils/notificationhubServicePartition";

/**
 * Orchestrator Name
 */
export const OrchestratorName = "HandleNHDeleteInstallationCallOrchestrator";

/**
 * Carries information about Notification Hub Message payload
 */
export type OrchestratorCallInput = t.TypeOf<typeof OrchestratorCallInput>;
export const OrchestratorCallInput = t.interface({
  message: DeleteInstallationMessage
});

interface IHandlerParams {
  deleteInstallationActivity: o.CallableActivity<
    DeleteInstallationActivityBodyImpl
  >;
  legacyNotificationHubConfig: NotificationHubConfig;
}

export const getHandler = ({
  deleteInstallationActivity,
  legacyNotificationHubConfig
}: IHandlerParams) => {
  return o.createOrchestrator(
    OrchestratorName,
    OrchestratorCallInput,
    function*({
      context,
      input: {
        message: { installationId }
      } /* , logger */
    }): Generator<Task, void, Task> {
      yield* deleteInstallationActivity(context, {
        installationId,
        notificationHubConfig: legacyNotificationHubConfig
      });
    }
  );
};
