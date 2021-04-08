import { Task } from "durable-functions/lib/src/classes";
import * as t from "io-ts";
import * as o from "../utils/durable/orchestrators";

import { DeleteInstallationMessage } from "../generated/notifications/DeleteInstallationMessage";
import { ActivityBodyImpl as DeleteActivityBodyImpl } from "../HandleNHDeleteInstallationCallActivity";
import { NotificationHubConfig } from "../utils/notificationhubServicePartition";

export const OrchestratorName = "HandleNHDeleteInstallationCallOrchestrator";

/**
 * Carries information about Notification Hub Message payload
 */
export type OrchestratorCallInput = t.TypeOf<typeof OrchestratorCallInput>;
export const OrchestratorCallInput = t.interface({
  message: DeleteInstallationMessage
});

interface IHandlerParams {
  deleteActivity: o.CallableActivity<DeleteActivityBodyImpl>;
  notificationHubConfig: NotificationHubConfig;
}

export const getHandler = ({
  deleteActivity,
  notificationHubConfig
}: IHandlerParams) => {
  return o.createOrchestrator(
    OrchestratorName,
    OrchestratorCallInput,
    function*({
      context,
      input: {
        message: { installationId }
      }
    }): Generator<Task, void, Task> {
      yield* deleteActivity(context, {
        installationId,
        notificationHubConfig
      });
    }
  );
};
