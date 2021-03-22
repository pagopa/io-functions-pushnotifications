import * as df from "durable-functions";
import { IOrchestrationFunctionContext } from "durable-functions/lib/src/classes";

import { isLeft } from "fp-ts/lib/Either";
import * as t from "io-ts";

import { readableReport } from "italia-ts-commons/lib/reporters";

import { NotificationMessage } from "../HandleNHNotificationCall";

/**
 * Carries information about Notification Hub Message payload
 */
export const NhNotificationOrchestratorInput = t.interface({
  message: NotificationMessage
});

export type NhNotificationOrchestratorInput = t.TypeOf<
  typeof NhNotificationOrchestratorInput
>;

export const handler = function*(
  context: IOrchestrationFunctionContext
): Generator<unknown> {
  const logPrefix = `NHCallOrchestrator`;

  const retryOptions = {
    ...new df.RetryOptions(5000, 10),
    backoffCoefficient: 1.5
  };

  // Get and decode orchestrator input
  const input = context.df.getInput();
  const errorOrNHCallOrchestratorInput = NhNotificationOrchestratorInput.decode(
    input
  );

  if (isLeft(errorOrNHCallOrchestratorInput)) {
    context.log.error(`${logPrefix}|Error decoding input`);
    context.log.verbose(
      `${logPrefix}|Error decoding input|ERROR=${readableReport(
        errorOrNHCallOrchestratorInput.value
      )}`
    );
    return false;
  }

  const nhCallOrchestratorInput = errorOrNHCallOrchestratorInput.value;

  yield context.df.callActivityWithRetry(
    "HandleNHNotificationCallActivity",
    retryOptions,
    nhCallOrchestratorInput
  );

  return true;
};
