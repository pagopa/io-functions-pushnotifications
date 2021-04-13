import { Task } from "durable-functions/lib/src/classes";
import * as t from "io-ts";

import { DeleteInstallationMessage } from "../generated/notifications/DeleteInstallationMessage";

import { ActivityInput as DeleteInstallationActivityInput } from "../HandleNHDeleteInstallationCallActivity";

import * as o from "../utils/durable/orchestrators";
import { NotificationHubConfig } from "../utils/notificationhubServicePartition";

/**
 * Orchestrator Name
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const OrchestratorName = "HandleNHDeleteInstallationCallOrchestrator";

/**
 * Carries information about Notification Hub Message payload
 */
export type OrchestratorCallInput = t.TypeOf<typeof OrchestratorCallInput>;
// eslint-disable-next-line @typescript-eslint/naming-convention
export const OrchestratorCallInput = t.interface({
  message: DeleteInstallationMessage
});

interface IHandlerParams {
  readonly deleteInstallationActivity: o.CallableActivity<
    DeleteInstallationActivityInput
  >;
  readonly legacyNotificationHubConfig: NotificationHubConfig;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const getHandler = ({
  deleteInstallationActivity,
  legacyNotificationHubConfig
}: IHandlerParams) =>
  o.createOrchestrator(OrchestratorName, OrchestratorCallInput, function*({
    context,
    input: {
      message: { installationId }
    } /* , logger */
  }): Generator<Task, void, Task> {
    yield* deleteInstallationActivity(context, {
      installationId,
      notificationHubConfig: legacyNotificationHubConfig
    });
  });
