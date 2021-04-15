import { Task } from "durable-functions/lib/src/classes";
import * as t from "io-ts";

import * as o from "../utils/durable/orchestrators";
import { NotificationHubConfig } from "../utils/notificationhubServicePartition";

import { DeleteInstallationMessage } from "../generated/notifications/DeleteInstallationMessage";

import { ActivityInput as DeleteInstallationActivityInput } from "../HandleNHDeleteInstallationCallActivity";
import {
  ActivityInput as IsUserInActiveSubsetActivityInput,
  ActivityResultSuccessWithValue as IsUserInActiveSubsetResultSuccess
} from "../IsUserInActiveSubsetActivity";

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
  readonly deleteInstallationActivity: o.CallableActivity<
    DeleteInstallationActivityInput
  >;
  readonly isUserInActiveTestSubsetActivity: o.CallableActivity<
    IsUserInActiveSubsetActivityInput,
    IsUserInActiveSubsetResultSuccess
  >;
  readonly legacyNotificationHubConfig: NotificationHubConfig;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const getHandler = ({
  deleteInstallationActivity,
  isUserInActiveTestSubsetActivity,
  legacyNotificationHubConfig
}: IHandlerParams) => {
  return o.createOrchestrator(
    OrchestratorName,
    OrchestratorCallInput,
    function*({
      context,
      input: {
        message: { installationId }
      },
      logger
    }): Generator<Task, void, Task> {
      const isUserATestUser = yield* isUserInActiveTestSubsetActivity(context, {
        installationId
      });

      logger.info(
        `INSTALLATION_ID:${installationId}|IS_TEST_USER:${isUserATestUser.value}`
      );

      yield* deleteInstallationActivity(context, {
        installationId,
        notificationHubConfig: legacyNotificationHubConfig
      });
    }
  );
};
