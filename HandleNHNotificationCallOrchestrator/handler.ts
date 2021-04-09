import * as ai from "applicationinsights";
import * as df from "durable-functions";
import { IOrchestrationFunctionContext } from "durable-functions/lib/src/classes";

import { isLeft } from "fp-ts/lib/Either";
import * as t from "io-ts";

import { readableReport } from "italia-ts-commons/lib/reporters";

import { NotificationMessage } from "../HandleNHNotificationCall/handler";
import { HandleNHNotificationCallActivityInput } from "../HandleNHNotificationCallActivity/handler";
import {
  ActivityInput as IsUserInActiveSubsetActivityInput,
  activityResultSuccessWithValue
} from "../IsUserInActiveSubsetActivity";

import { IConfig } from "../utils/config";
import { trackExceptionAndThrow } from "../utils/durable/orchestrators/log";
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

export const getHandler = (
  envConfig: IConfig,
  aiTelemetryClient: ai.TelemetryClient,
  logPrefix: string = `NHCallOrchestrator`
) =>
  function*(context: IOrchestrationFunctionContext): Generator<unknown> {
    const trackExAndThrow = trackExceptionAndThrow(
      context,
      aiTelemetryClient,
      logPrefix
    );

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

    const isUserEnabledForTestActivityInput: IsUserInActiveSubsetActivityInput = {
      enabledFeatureFlag: envConfig.NH_PARTITION_FEATURE_FLAG,
      installationId:
        errorOrNHCallOrchestratorInput.value.message.installationId
    };

    const isUserEnabledForTestOutput = yield context.df.callActivityWithRetry(
      "IsUserInActiveSubsetActivity",
      retryOptions,
      isUserEnabledForTestActivityInput
    );

    const isUserEnabledForTest = activityResultSuccessWithValue
      .decode(isUserEnabledForTestOutput)
      .getOrElseL(_ =>
        trackExAndThrow(
          _,
          "notificationorchestrator.exception.failure.isuserenabled"
        )
      );

    if (isUserEnabledForTest.value) {
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
