import * as t from "io-ts";

import { Task } from "durable-functions/lib/src/classes";

import * as df from "durable-functions";

import { CreateOrUpdateInstallationMessage } from "../generated/notifications/CreateOrUpdateInstallationMessage";

import {
  ActivityInput as CreateOrUpdateActivityInput,
  ActivityName as CreateOrUpdateActivityName
} from "../HandleNHCreateOrUpdateInstallationCallActivity/handler";

import { IConfig } from "../utils/config";
import { getNHLegacyConfig } from "../utils/notificationhubServicePartition";
import * as o from "../utils/orchestrators";

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

export const getHandler = (envConfig: IConfig) => {
  const retryOptions = {
    ...new df.RetryOptions(5000, envConfig.RETRY_ATTEMPT_NUMBER),
    backoffCoefficient: 1.5
  };

  return o.createOrchestrator(
    OrchestratorName,
    NhCreateOrUpdateInstallationOrchestratorCallInput,
    function*({
      context,
      input: { message } /* , logger */
    }): Generator<Task, void, Task> {
      yield* o.callActivity<CreateOrUpdateActivityInput>(
        CreateOrUpdateActivityName,
        context,
        {
          installationId: message.installationId,
          notificationHubConfig: getNHLegacyConfig(envConfig),
          platform: message.platform,
          pushChannel: message.pushChannel,
          tags: message.tags
        },
        retryOptions
      );
    }
  );
};
