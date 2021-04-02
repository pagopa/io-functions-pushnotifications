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

/**
 * Carries information about Notification Hub Message payload
 */
export const NhDeleteInstallationOrchestratorCallInput = t.interface({
  message: DeleteInstallationMessage
});

export type NhDeleteInstallationOrchestratorCallInput = t.TypeOf<
  typeof NhDeleteInstallationOrchestratorCallInput
>;

export type OrchestratorSuccess = t.TypeOf<typeof OrchestratorSuccess>;
export const OrchestratorSuccess = t.interface({
  kind: t.literal("SUCCESS")
});

export type OrchestratorInvalidInputFailure = t.TypeOf<
  typeof OrchestratorInvalidInputFailure
>;
export const OrchestratorInvalidInputFailure = t.interface({
  input: t.unknown,
  kind: t.literal("FAILURE_INVALID_INPUT"),
  reason: t.string
});

export type OrchestratorActivityFailure = t.TypeOf<
  typeof OrchestratorActivityFailure
>;
export const OrchestratorActivityFailure = t.interface({
  activityName: t.string,
  kind: t.literal("FAILURE_ACTIVITY"),
  reason: t.string
});

export type OrchestratorUnhandledFailure = t.TypeOf<
  typeof OrchestratorUnhandledFailure
>;
export const OrchestratorUnhandledFailure = t.interface({
  kind: t.literal("FAILURE_UNHANDLED"),
  reason: t.string
});

export type OrchestratorFailure = t.TypeOf<typeof OrchestratorFailure>;
export const OrchestratorFailure = t.union([
  OrchestratorActivityFailure,
  OrchestratorInvalidInputFailure,
  OrchestratorUnhandledFailure
]);

const defaultNever = <T>(_: never, d: T) => d;

const logPrefix = `NhDeleteInstallationOrchestratorCallInput`;
const logError = (
  context: IOrchestrationFunctionContext,
  failure: OrchestratorFailure
) => {
  const log = `${logPrefix}|Error executing orchestrator: ${failure.kind}`;
  const verbose: string =
    failure.kind === "FAILURE_INVALID_INPUT"
      ? `ERROR=${failure.reason}|INPUT=${toString(failure.input)}`
      : failure.kind === "FAILURE_ACTIVITY"
      ? `ERROR=${failure.reason}|ACTIVITY=${failure.activityName}`
      : failure.kind === "FAILURE_UNHANDLED"
      ? `ERROR=${failure.reason}`
      : defaultNever(
          failure,
          `unknown failure kind, failure: ${toString(failure)}`
        );
  context.log.error(log);
  context.log.verbose(`${log}|${verbose}`);
};

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
      logError(context, failure);
      return failure;
    }
  };
