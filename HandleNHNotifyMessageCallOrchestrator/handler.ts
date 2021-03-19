import * as t from "io-ts";

import * as df from "durable-functions";
import { Task } from "durable-functions/lib/src/classes";

import {
  ActivityInput as NotifyMessageActivityInput,
  ActivityName as NotifyMessageActivityName
} from "../HandleNHNotifyMessageCallActivity/handler";

import { NotifyMessage } from "../generated/notifications/NotifyMessage";

import { IConfig } from "../utils/config";
import { getNHLegacyConfig } from "../utils/notificationhubServicePartition";
import * as o from "../utils/orchestrators/index";

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

export const getHandler = (config: IConfig) => {
  const retryOptions = {
    ...new df.RetryOptions(5000, config.RETRY_ATTEMPT_NUMBER),
    backoffCoefficient: 1.5
  };

  return o.createOrchestrator(
    OrchestratorName,
    NhNotifyMessageOrchestratorCallInput,
    function*({
      context,
      input: { message } /* , logger */
    }): Generator<Task, void, Task> {
      yield* o.callActivity<NotifyMessageActivityInput>(
        NotifyMessageActivityName,
        context,
        {
          message,
          notificationHubConfig: getNHLegacyConfig(config)
        },
        retryOptions
      );
    }
  );
};
