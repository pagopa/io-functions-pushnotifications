import * as t from "io-ts";

import { either, left, right } from "fp-ts/lib/Either";

import {
  IOrchestrationFunctionContext,
  Task
} from "durable-functions/lib/src/classes";

import * as df from "durable-functions";
import { readableReport } from "italia-ts-commons/lib/reporters";

import { CreateOrUpdateInstallationMessage } from "../generated/notifications/CreateOrUpdateInstallationMessage";

import {
  ActivityInput as CreateOrUpdateActivityInput,
  ActivityName as CreateOrUpdateActivityName
} from "../HandleNHCreateOrUpdateInstallationCallActivity/handler";

import {
  ActivityResult,
  ActivityResultFailure,
  ActivityResultSuccess
} from "../utils/activity";
import { IConfig } from "../utils/config";
import {
  getNHLegacyConfig,
  NotificationHubConfig
} from "../utils/notificationhubServicePartition";
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

function* callCreateOrUpdateInstallation(
  context: IOrchestrationFunctionContext,
  retryOptions: df.RetryOptions,
  message: CreateOrUpdateInstallationMessage,
  notificationHubConfig: NotificationHubConfig
): Generator<Task, "SUCCESS"> {
  const nhCallOrchestratorInput: CreateOrUpdateActivityInput = {
    installationId: message.installationId,
    notificationHubConfig,
    platform: message.platform,
    pushChannel: message.pushChannel,
    tags: message.tags
  };

  const activityName = CreateOrUpdateActivityName;

  const result = yield context.df.callActivityWithRetry(
    activityName,
    retryOptions,
    nhCallOrchestratorInput
  );

  return either
    .of<ActivityResultFailure | Error, unknown>(result)
    .chain(r =>
      ActivityResult.decode(r).mapLeft(
        e =>
          new Error(
            `Cannot decode result from ${activityName}, err: ${readableReport(
              e
            )}`
          )
      )
    )
    .chain(r => (ActivityResultSuccess.is(r) ? right(r) : left(r)))
    .fold(
      // In case of failure, trow a failure object with the activity name
      e => {
        throw o.failureActivity(
          activityName,
          e instanceof Error ? e.message : e.reason
        );
      },
      _ => "SUCCESS" as const
    );
}

export const getHandler = (envConfig: IConfig) => {
  const retryOptions = {
    ...new df.RetryOptions(5000, envConfig.RETRY_ATTEMPT_NUMBER),
    backoffCoefficient: 1.5
  };

  const nhConfig = getNHLegacyConfig(envConfig);

  return o.createOrchestrator(
    OrchestratorName,
    NhCreateOrUpdateInstallationOrchestratorCallInput,
    function*({
      context,
      input: { message } /* , logger */
    }): Generator<Task, void, Task> {
      yield* callCreateOrUpdateInstallation(
        context,
        retryOptions,
        message,
        nhConfig
      );
    }
  );
};
