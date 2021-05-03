import * as t from "io-ts";

import { Task } from "durable-functions/lib/src/classes";

import { getCallableActivity as getNotifyCallableActivity } from "../HandleNHNotifyMessageCallActivity";

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
  readonly legacyNotificationHubConfig: NotificationHubConfig;
  readonly notificationHubConfigPartitionChooser: ReturnType<
    typeof getNotificationHubPartitionConfig
  >;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const getHandler = ({
  notifyMessageActivity,
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

      const notificationHubConfigPartition = notificationHubConfigPartitionChooser(
        installationId
      );

      logger.info(
        `Pushing the message to user ${installationId} on Notification Hub ${notificationHubConfigPartition.AZURE_NH_HUB_NAME}`
      );

      yield* notifyMessageActivity(context, {
        message,
        notificationHubConfig: notificationHubConfigPartition
      });
    }
  );
