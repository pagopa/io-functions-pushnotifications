import { Task } from "durable-functions/lib/src/classes";
import * as t from "io-ts";

import { NHPartitionFeatureFlag } from "../utils/config";
import * as o from "../utils/durable/orchestrators";
import { NotificationHubConfig } from "../utils/notificationhubServicePartition";

import { DeleteInstallationMessage } from "../generated/notifications/DeleteInstallationMessage";

import { ActivityBodyImpl as DeleteInstallationActivityBodyImpl } from "../HandleNHDeleteInstallationCallActivity";
import { ActivityBodyImpl as IsUserInActiveSubsetActivityBodyImpl } from "../IsUserInActiveSubsetActivity";

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
  isUserInActiveTestSubsetActivity: o.CallableActivity<
    IsUserInActiveSubsetActivityBodyImpl
  >;
  legacyNotificationHubConfig: NotificationHubConfig;
  enabledNHFeatureFlag: NHPartitionFeatureFlag;
}

export const getHandler = ({
  deleteInstallationActivity,
  isUserInActiveTestSubsetActivity,
  enabledNHFeatureFlag,
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
        enabledFeatureFlag: enabledNHFeatureFlag,
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
