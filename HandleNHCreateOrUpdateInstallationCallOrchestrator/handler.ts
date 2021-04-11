import { Task } from "durable-functions/lib/src/classes";
import * as t from "io-ts";

import * as o from "../utils/durable/orchestrators";
import { NotificationHubConfig } from "../utils/notificationhubServicePartition";

import { CreateOrUpdateInstallationMessage } from "../generated/notifications/CreateOrUpdateInstallationMessage";

import { ActivityBodyImpl as CreateOrUpdateActivityBodyImpl } from "../HandleNHCreateOrUpdateInstallationCallActivity";
import { ActivityBodyImpl as IsUserInActiveSubsetActivityBodyImpl } from "../IsUserInActiveSubsetActivity";

export const OrchestratorName =
  "HandleNHCreateOrUpdateInstallationCallOrchestrator";

/**
 * Carries information about Notification Hub Message payload
 */
export const NhCreateOrUpdateInstallationOrchestratorCallInput = t.interface({
  message: CreateOrUpdateInstallationMessage
});

export type NhCreateOrUpdateInstallationOrchestratorCallInput = t.TypeOf<
  typeof NhCreateOrUpdateInstallationOrchestratorCallInput
>;

interface IHandlerParams {
  createOrUpdateActivity: o.CallableActivity<CreateOrUpdateActivityBodyImpl>;
  isUserInActiveTestSubsetActivity: o.CallableActivity<
    IsUserInActiveSubsetActivityBodyImpl
  >;
  notificationHubConfig: NotificationHubConfig;
}

export const getHandler = ({
  createOrUpdateActivity,
  isUserInActiveTestSubsetActivity,
  notificationHubConfig
}: IHandlerParams) => {
  return o.createOrchestrator(
    OrchestratorName,
    NhCreateOrUpdateInstallationOrchestratorCallInput,
    function*({
      context,
      input: {
        message: { installationId, platform, pushChannel, tags }
      },
      logger
    }): Generator<Task, void, Task> {
      const isUserATestUser = yield* isUserInActiveTestSubsetActivity(context, {
        installationId
      });

      logger.info(
        `INSTALLATION_ID:${installationId}|IS_TEST_USER:${isUserATestUser.value}`
      );

      yield* createOrUpdateActivity(context, {
        installationId,
        notificationHubConfig,
        platform,
        pushChannel,
        tags
      });
    }
  );
};
