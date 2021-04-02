import { IOrchestrationFunctionContext } from "durable-functions/lib/src/classes";
import { toString } from "fp-ts/lib/function";

import { OrchestratorFailure } from "./returnTypes";

const defaultNever = <T>(_: never, d: T) => d;

export const logError = (
  context: IOrchestrationFunctionContext,
  failure: OrchestratorFailure,
  logPrefix: string
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
