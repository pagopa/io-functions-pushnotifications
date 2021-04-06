import * as df from "durable-functions";
import { Task } from "durable-functions/lib/src/classes";
import * as t from "io-ts";

import { DeleteInstallationMessage } from "../generated/notifications/DeleteInstallationMessage";
import {
  ActivityInput as NHDeleteInstallationActivityInput,
  ActivityName as NHDeleteInstallationActivityName
} from "../HandleNHDeleteInstallationCallActivity/handler";

import { IConfig } from "../utils/config";
import { getNHLegacyConfig } from "../utils/notificationhubServicePartition";
import * as o from "../utils/orchestrators";

/**
 * Orchestrator Name
 */
export const OrchestratorName = "HandleNHDeleteInstallationCallOrchestrator";

/**
 * Carries information about Notification Hub Message payload
 */
export const NhDeleteInstallationOrchestratorCallInput = t.interface({
  message: DeleteInstallationMessage
});

export type NhDeleteInstallationOrchestratorCallInput = t.TypeOf<
  typeof NhDeleteInstallationOrchestratorCallInput
>;

export const getHandler = (envConfig: IConfig) => {
  const retryOptions = {
    ...new df.RetryOptions(5000, envConfig.RETRY_ATTEMPT_NUMBER),
    backoffCoefficient: 1.5
  };

  return o.createOrchestrator(
    OrchestratorName,
    NhDeleteInstallationOrchestratorCallInput,
    function*({
      context,
      input: { message } /* , logger */
    }): Generator<Task, void, Task> {
      yield* o.callActivity<NHDeleteInstallationActivityInput>(
        NHDeleteInstallationActivityName,
        context,
        {
          installationId: message.installationId,
          notificationHubConfig: getNHLegacyConfig(envConfig)
        },
        retryOptions
      );
    }
  );
};
