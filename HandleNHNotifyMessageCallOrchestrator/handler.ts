import * as t from "io-ts";

import { Task } from "durable-functions/lib/src/classes";

import { ActivityBodyImpl as NotifyMessageActivityBodyImpl } from "../HandleNHNotifyMessageCallActivity";

import { NotifyMessage } from "../generated/notifications/NotifyMessage";

import {
  CallableActivity,
  createOrchestrator
} from "../utils/durable/orchestrators";
import { NotificationHubConfig } from "../utils/notificationhubServicePartition";

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
  notifyMessageActivity: CallableActivity<NotifyMessageActivityBodyImpl>;
  legacyNotificationHubConfig: NotificationHubConfig;
}

export const getHandler = ({
  notifyMessageActivity,
  legacyNotificationHubConfig
}: IHandlerParams) => {
  return createOrchestrator(
    OrchestratorName,
    NhNotifyMessageOrchestratorCallInput,
    function*({ context, input: { message } }): Generator<Task, void, Task> {
      yield* notifyMessageActivity(context, {
        message,
        notificationHubConfig: legacyNotificationHubConfig
      });
    }
  );
};
