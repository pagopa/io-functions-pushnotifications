import * as t from "io-ts";

import { isLeft } from "fp-ts/lib/Either";

import { IOrchestrationFunctionContext } from "durable-functions/lib/src/classes";

import * as df from "durable-functions";
import { readableReport } from "italia-ts-commons/lib/reporters";

import { DeleteInstallationMessage } from "../generated/notifications/DeleteInstallationMessage";

import { ActivityInput as NHDeleteInstallationActivityInput } from "../HandleNHDeleteInstallationCallActivity/handler";
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

const logError = (
  context: IOrchestrationFunctionContext,
  logPrefix: string,
  errorOrNHCallOrchestratorInput
) => {
  context.log.error(`${logPrefix}|Error decoding input`);
  context.log.verbose(
    `${logPrefix}|Error decoding input|ERROR=${readableReport(
      errorOrNHCallOrchestratorInput.value
    )}`
  );
};

export const getHandler = (config: IConfig) =>
  function*(context: IOrchestrationFunctionContext): Generator<unknown> {
    const logPrefix = `NhDeleteInstallationOrchestratorCallInput`;

    const retryOptions = {
      ...new df.RetryOptions(5000, config.RETRY_ATTEMPT_NUMBER),
      backoffCoefficient: 1.5
    };

    // Get and decode orchestrator input
    const input = context.df.getInput();
    const errorOrNHCallOrchestratorInput = NhDeleteInstallationOrchestratorCallInput.decode(
      input
    );

    if (isLeft(errorOrNHCallOrchestratorInput)) {
      logError(context, logPrefix, errorOrNHCallOrchestratorInput);
      return false;
    }

    const nhConfig = getNHLegacyConfig(config);

    const nhCallOrchestratorInput: NHDeleteInstallationActivityInput = {
      ...errorOrNHCallOrchestratorInput.value,
      notificationHubConfig: nhConfig
    };

    yield context.df.callActivityWithRetry(
      "HandleNHDeleteInstallationCallActivity",
      retryOptions,
      nhCallOrchestratorInput
    );

    return true;
  };
