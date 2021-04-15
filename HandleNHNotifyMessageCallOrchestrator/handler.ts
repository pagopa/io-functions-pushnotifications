import * as t from "io-ts";

import { Task } from "durable-functions/lib/src/classes";

import {
  ActivityInput as NotifyMessageActivityInput,
  ActivityResultSuccess as NotifyMessageActivityResultSuccess
} from "../HandleNHNotifyMessageCallActivity";
import {
  ActivityInput as IsUserInActiveSubsetActivityInput,
  ActivityResultSuccessWithValue as IsUserInActiveSubsetActivityResultSuccess
} from "../IsUserInActiveSubsetActivity";

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
  readonly notifyMessageActivity: CallableActivity<
    NotifyMessageActivityInput,
    NotifyMessageActivityResultSuccess
  >;
  isUserInActiveTestSubsetActivity: CallableActivity<
    IsUserInActiveSubsetActivityInput,
    IsUserInActiveSubsetActivityResultSuccess
  >;
  readonly legacyNotificationHubConfig: NotificationHubConfig;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const getHandler = ({
  notifyMessageActivity,
  isUserInActiveTestSubsetActivity,
  legacyNotificationHubConfig
}: IHandlerParams) =>
  createOrchestrator(
    OrchestratorName,
    NhNotifyMessageOrchestratorCallInput,
    function*({
      context,
      input: { message },
      logger
    }): Generator<Task, void, Task> {
      const installationId = message.installationId;

      const isUserATestUser = yield* isUserInActiveTestSubsetActivity(context, {
        installationId
      });

      logger.info(
        `INSTALLATION_ID:${installationId}|IS_TEST_USER:${isUserATestUser.value}`
      );

      yield* notifyMessageActivity(context, {
        message,
        notificationHubConfig: legacyNotificationHubConfig
      });
    }
  );
