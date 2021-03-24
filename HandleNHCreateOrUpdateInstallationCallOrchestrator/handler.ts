import * as t from "io-ts";

import { isLeft } from "fp-ts/lib/Either";

import { IOrchestrationFunctionContext } from "durable-functions/lib/src/classes";

import * as df from "durable-functions";
import { readableReport } from "italia-ts-commons/lib/reporters";

import { CreateOrUpdateInstallationMessage } from "../generated/notifications/CreateOrUpdateInstallationMessage";

import { ActivityInput as CreateOrUpdateActivityInput } from "../HandleNHCreateOrUpdateInstallationCallActivity/handler";
import { IConfig } from "../utils/config";
import { getNHLegacyConfig } from "../utils/notificationhubServicePartition";

/**
 * Carries information about Notification Hub Message payload
 */
export const NhCreateOrUpdateInstallationOrchestratorCallInput = t.interface({
  message: CreateOrUpdateInstallationMessage
});

export type NhCreateOrUpdateInstallationOrchestratorCallInput = t.TypeOf<
  typeof NhCreateOrUpdateInstallationOrchestratorCallInput
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

export const getHandler = (envConfig: IConfig) =>
  function*(context: IOrchestrationFunctionContext): Generator<unknown> {
    const logPrefix = `NhCreateOrUpdateInstallationOrchestratorCallInput`;

    const retryOptions = {
      ...new df.RetryOptions(5000, envConfig.RETRY_ATTEMPT_NUMBER),
      backoffCoefficient: 1.5
    };

    // Get and decode orchestrator input
    const input = context.df.getInput();
    const errorOrNHCreateOrUpdateCallOrchestratorInput = NhCreateOrUpdateInstallationOrchestratorCallInput.decode(
      input
    );

    if (isLeft(errorOrNHCreateOrUpdateCallOrchestratorInput)) {
      logError(
        context,
        logPrefix,
        errorOrNHCreateOrUpdateCallOrchestratorInput
      );
      return false;
    }

    const nhConfig = getNHLegacyConfig(envConfig);

    const nhCallOrchestratorInput: CreateOrUpdateActivityInput = {
      ...errorOrNHCreateOrUpdateCallOrchestratorInput.value,
      notificationHubConfig: nhConfig
    };

    yield context.df.callActivityWithRetry(
      "HandleNHCreateOrUpdateInstallationCallActivity",
      retryOptions,
      nhCallOrchestratorInput
    );

    return true;
  };
