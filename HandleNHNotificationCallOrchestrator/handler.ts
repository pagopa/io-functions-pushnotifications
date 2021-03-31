import * as df from "durable-functions";
import { IOrchestrationFunctionContext } from "durable-functions/lib/src/classes";

import { isLeft } from "fp-ts/lib/Either";
import * as t from "io-ts";

import { readableReport } from "italia-ts-commons/lib/reporters";

import { NotificationMessage } from "../HandleNHNotificationCall/handler";
import { HandleNHNotificationCallActivityInput } from "../HandleNHNotificationCallActivity/handler";
import { IConfig } from "../utils/config";
import { isInActiveSubset } from "../utils/featureFlags";
import { getNHLegacyConfig } from "../utils/notificationhubServicePartition";

/**
 * Carries information about Notification Hub Message payload
 */
export const NhNotificationOrchestratorInput = t.interface({
  message: NotificationMessage
});

export type NhNotificationOrchestratorInput = t.TypeOf<
  typeof NhNotificationOrchestratorInput
>;

export const getHandler = (envConfig: IConfig) =>
  function*(context: IOrchestrationFunctionContext): Generator<unknown> {
    const logPrefix = `NHCallOrchestrator`;

    const retryOptions = {
      ...new df.RetryOptions(5000, envConfig.RETRY_ATTEMPT_NUMBER),
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

    // Dummy implementation for testing

    const ff = envConfig.NH_PARTITION_FEATURE_FLAG;

    if (
      isInActiveSubset(
        ff,
        errorOrNHCallOrchestratorInput.value.message.installationId
      )
    ) {
      const nhConfig = getNHLegacyConfig(envConfig);

      const nhCallOrchestratorInput: HandleNHNotificationCallActivityInput = {
        ...errorOrNHCallOrchestratorInput.value,
        notificationHubConfig: nhConfig
      };

      yield context.df.callActivityWithRetry(
        "HandleNHNotificationCallActivity",
        retryOptions,
        nhCallOrchestratorInput
      );
    }

    return true;
  };
