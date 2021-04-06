import { IOrchestrationFunctionContext } from "durable-functions/lib/src/classes";
import { toString } from "fp-ts/lib/function";

import { OrchestratorFailure } from "./returnTypes";

const defaultNever = <T>(_: never, d: T) => d;

export interface OrchestratorLogger {
  error: (failure: OrchestratorFailure) => void;
}

/**
 * Creates a logger object which is bound to an orchestrator context
 * @param {IOrchestrationFunctionContext} context the context of execution of the orchestrator
 * @param {string} logPrefix a string to prepend to every log entry, usually the name of the orchestrator. Default: empty string
 * @returns {OrchestratorLogger} a logger instance
 */
export const createLogger = (
  context: IOrchestrationFunctionContext,
  logPrefix: string = ""
): OrchestratorLogger => ({
  /**
   * Logs a failure in the orchestrator execution
   * @param failure an encoded orchestrator failure
   */
  error(failure: OrchestratorFailure) {
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
  }
});
