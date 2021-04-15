import * as ai from "applicationinsights";
import { IOrchestrationFunctionContext } from "durable-functions/lib/src/classes";

import { toString } from "fp-ts/lib/function";
import * as t from "io-ts";

import { readableReport } from "italia-ts-commons/lib/reporters";

import { OrchestratorFailure } from "./returnTypes";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const defaultNever = <T>(_: never, d: T) => d;

export interface IOrchestratorLogger {
  readonly error: (failure: OrchestratorFailure) => void;
  readonly info: (s: string) => void;
}

/**
 * Creates a logger object which is bound to an orchestrator context
 *
 * @param {IOrchestrationFunctionContext} context the context of execution of the orchestrator
 * @param {string} logPrefix a string to prepend to every log entry, usually the name of the orchestrator. Default: empty string
 * @returns {IOrchestratorLogger} a logger instance
 */
export const createLogger = (
  context: IOrchestrationFunctionContext,
  logPrefix: string = ""
): IOrchestratorLogger => ({
  /**
   * Logs a failure in the orchestrator execution
   *
   * @param failure an encoded orchestrator failure
   */
  // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
  error(failure: OrchestratorFailure): void {
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
  },
  // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
  info(s: string): void {
    context.log.info(`${logPrefix}|${s}`);
  }
});

export const trackExceptionAndThrow = (
  context: IOrchestrationFunctionContext,
  aiTelemetry: ai.TelemetryClient,
  logPrefix: string
) => (err: Error | t.Errors, name: string): never => {
  const errMessage = err instanceof Error ? err.message : readableReport(err);
  context.log.verbose(`${logPrefix}|ERROR=${errMessage}`);
  aiTelemetry.trackException({
    exception: new Error(`${logPrefix}|ERROR=${errMessage}`),
    properties: {
      name
    }
  });
  throw new Error(errMessage);
};
