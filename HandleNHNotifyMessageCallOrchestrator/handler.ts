import * as t from "io-ts";

import { Task } from "durable-functions/lib/src/classes";

import { getCallableActivity as getNotifyCallableActivity } from "../HandleNHNotifyMessageCallActivity";
import { getCallableActivity as getIsUserInActiveSubsetActivityCallableActivity } from "../IsUserInActiveSubsetActivity";

import { NotifyMessage } from "../generated/notifications/NotifyMessage";

import { createOrchestrator } from "../utils/durable/orchestrators";
import {
  getNotificationHubPartitionConfig,
  NotificationHubConfig
} from "../utils/notificationhubServicePartition";

/**
 * Orchestrator Name
 */
export const OrchestratorName = "HandleNHNotifyMessageCallOrchestrator";

/**
 * Carries information about Notification Hub Message payload
 */
export const NhNotifyMessageOrchestratorCallInput = t.interface({
  message: NotifyMessage
});

export type NhNotifyMessageOrchestratorCallInput = t.TypeOf<
  typeof NhNotifyMessageOrchestratorCallInput
>;

interface IHandlerParams {
  readonly notifyMessageActivity: ReturnType<typeof getNotifyCallableActivity>;
  readonly isUserInActiveTestSubsetActivity: ReturnType<
    typeof getIsUserInActiveSubsetActivityCallableActivity
  >;
  readonly legacyNotificationHubConfig: NotificationHubConfig;
  readonly notificationHubConfigPartitionChooser: ReturnType<
    typeof getNotificationHubPartitionConfig
  >;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const getHandler = ({
  notifyMessageActivity,
  isUserInActiveTestSubsetActivity,
  legacyNotificationHubConfig,
  notificationHubConfigPartitionChooser
}: IHandlerParams) =>
  createOrchestrator(
    OrchestratorName,
    NhNotifyMessageOrchestratorCallInput,
    function*({
      context,
      input: { message },
      logger
    }): Generator<Task, void, Task> {
      const { installationId } = message;

      yield* notifyMessageActivity(context, {
        message,
        notificationHubConfig: legacyNotificationHubConfig
      });

      const isUserATestUser = yield* isUserInActiveTestSubsetActivity(context, {
        installationId
      });

      if (isUserATestUser.value) {
        logger.info(`TEST_USER:${installationId}`);

        const notificationHubConfigPartition = notificationHubConfigPartitionChooser(
          installationId
        );

        yield* notifyMessageActivity(context, {
          message,
          notificationHubConfig: notificationHubConfigPartition
        });
      }
    }
  );
