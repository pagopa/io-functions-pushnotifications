import * as df from "durable-functions";
import {
  IOrchestrationFunctionContext,
  Task
} from "durable-functions/lib/src/classes";
import * as t from "io-ts";

import { either, left, right } from "fp-ts/lib/Either";
import { toString } from "fp-ts/lib/function";

import { readableReport } from "italia-ts-commons/lib/reporters";

import { DeleteInstallationMessage } from "../generated/notifications/DeleteInstallationMessage";
import { ActivityInput as NHDeleteInstallationActivityInput } from "../HandleNHDeleteInstallationCallActivity/handler";

import {
  ActivityResult,
  ActivityResultFailure,
  ActivityResultSuccess
} from "../utils/activity";
import { IConfig } from "../utils/config";
import { getNHLegacyConfig } from "../utils/notificationhubServicePartition";
import { logError } from "../utils/orchestrators/log";
import {
  OrchestratorActivityFailure,
  OrchestratorFailure,
  OrchestratorInvalidInputFailure,
  OrchestratorSuccess,
  OrchestratorUnhandledFailure
} from "../utils/orchestrators/returnTypes";

/**
 * Carries information about Notification Hub Message payload
 */
export const NhDeleteInstallationOrchestratorCallInput = t.interface({
  message: DeleteInstallationMessage
});

export type NhDeleteInstallationOrchestratorCallInput = t.TypeOf<
  typeof NhDeleteInstallationOrchestratorCallInput
>;

const logPrefix = `NhDeleteInstallationOrchestratorCallInput`;

function* deleteInstallation(
  context: IOrchestrationFunctionContext,
  input: NHDeleteInstallationActivityInput,
  retryOptions: df.RetryOptions
): Generator<Task, "SUCCESS"> {
  const activityName = "HandleNHDeleteInstallationCallActivity";
  const result = yield context.df.callActivityWithRetry(
    activityName,
    retryOptions,
    input
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
        throw OrchestratorActivityFailure.encode({
          activityName,
          kind: "FAILURE_ACTIVITY",
          reason: e instanceof Error ? e.message : e.reason
        });
      },
      _ => "SUCCESS" as const
    );
}

export const getHandler = (config: IConfig) =>
  function*(context: IOrchestrationFunctionContext): Generator<unknown> {
    const retryOptions = {
      ...new df.RetryOptions(5000, config.RETRY_ATTEMPT_NUMBER),
      backoffCoefficient: 1.5
    };

    try {
      // Decode delete message from input
      const input = context.df.getInput();
      const { message } = NhDeleteInstallationOrchestratorCallInput.decode(
        input
      ).getOrElseL(err => {
        throw OrchestratorInvalidInputFailure.encode({
          input,
          kind: "FAILURE_INVALID_INPUT",
          reason: `${readableReport(err)}`
        });
      });

      yield* deleteInstallation(
        context,
        {
          installationId: message.installationId,
          notificationHubConfig: getNHLegacyConfig(config)
        },
        retryOptions
      );

      return OrchestratorSuccess.encode({ kind: "SUCCESS" });
    } catch (error) {
      const failure = OrchestratorFailure.decode(error).getOrElseL(_ =>
        OrchestratorUnhandledFailure.encode({
          kind: "FAILURE_UNHANDLED",
          reason: error instanceof Error ? error.message : toString(error)
        })
      );
      logError(context, failure, logPrefix);

      return failure;
    }
  };
