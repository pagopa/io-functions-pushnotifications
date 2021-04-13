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
// eslint-disable-next-line @typescript-eslint/naming-convention
export const OrchestratorName = "HandleNHNotifyMessageCallOrchestrator";

/**
 * Carries information about Notification Hub Message payload
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const NhNotifyMessageOrchestratorCallInput = t.interface({
  message: NotifyMessage
});

export type NhNotifyMessageOrchestratorCallInput = t.TypeOf<
  typeof NhNotifyMessageOrchestratorCallInput
>;

interface IHandlerParams {
  readonly notifyMessageActivity: CallableActivity<
    NotifyMessageActivityBodyImpl
  >;
  readonly legacyNotificationHubConfig: NotificationHubConfig;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const getHandler = ({
  notifyMessageActivity,
  legacyNotificationHubConfig
}: IHandlerParams) =>
  createOrchestrator(
    OrchestratorName,
    NhNotifyMessageOrchestratorCallInput,
    function*({ context, input: { message } }): Generator<Task, void, Task> {
      yield* notifyMessageActivity(context, {
        message,
        notificationHubConfig: legacyNotificationHubConfig
      });
    }
  );
