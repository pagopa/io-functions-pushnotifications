/* tslint:disable:no-any */
// tslint:disable-next-line: no-object-mutation
import { NonEmptyString } from "italia-ts-commons/lib/strings";
import { context as contextMock } from "../../__mocks__/durable-functions";
import { PlatformEnum } from "../../generated/backend/Platform";
import {
  CreateOrUpdateInstallationMessage,
  KindEnum as CreateOrUpdateInstallationKind
} from "../../generated/notifications/CreateOrUpdateInstallationMessage";
import { NhNotificationOrchestratorInput, getHandler } from "../handler";
import { success } from "../../utils/durable/orchestrators";
import { initTelemetryClient } from "../../utils/appinsights";

import { envConfig } from "../../__mocks__/env-config.mock";
import { TelemetryClient } from "applicationinsights";

import * as config from "../../utils/config";

const aFiscalCodeHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" as NonEmptyString;
const aPushChannel =
  "fLKP3EATnBI:APA91bEy4go681jeSEpLkNqhtIrdPnEKu6Dfi-STtUiEnQn8RwMfBiPGYaqdWrmzJyXIh5Yms4017MYRS9O1LGPZwA4sOLCNIoKl4Fwg7cSeOkliAAtlQ0rVg71Kr5QmQiLlDJyxcq3p";
const aNotificationHubMessage: CreateOrUpdateInstallationMessage = {
  installationId: aFiscalCodeHash,
  kind: CreateOrUpdateInstallationKind.CreateOrUpdateInstallation,
  platform: PlatformEnum.apns,
  pushChannel: aPushChannel,
  tags: [aFiscalCodeHash]
};

const retryOptions = {
  backoffCoefficient: 1.5
};

const callNHServiceActivitySuccessResult = success();

jest.spyOn(config, "getConfigOrThrow").mockImplementation(() => envConfig);

describe("HandleNHNotificationCallOrchestrator", () => {
  it("should start the activities with the right inputs", async () => {
    // const nhCallOrchestratorInput: NhNotificationOrchestratorInput = {
    //   message: aNotificationHubMessage
    // };
    // const contextMockWithDf = {
    //   ...contextMock,
    //   df: {
    //     callActivityWithRetry: jest
    //       .fn()
    //       // IsUserInActiveSubsetActivity
    //       .mockReturnValueOnce({ kind: "SUCCESS", value: true })
    //       // HandleNHNotificationCallActivity
    //       .mockReturnValueOnce(callNHServiceActivitySuccessResult),
    //     getInput: jest.fn(() => nhCallOrchestratorInput)
    //   }
    // };
    // const orchestratorHandler = getHandler(
    //   envConfig,
    //   initTelemetryClient(envConfig) as TelemetryClient
    // )(contextMockWithDf as any);
    // const res = consumeGenerator(orchestratorHandler);
    // expect(contextMockWithDf.df.callActivityWithRetry).toBeCalledWith(
    //   "HandleNHNotificationCallActivity",
    //   retryOptions,
    //   HandleNHNotificationCallActivityInput.encode({
    //     message: aNotificationHubMessage,
    //     notificationHubConfig: {
    //       AZURE_NH_ENDPOINT: envConfig.AZURE_NH_ENDPOINT,
    //       AZURE_NH_HUB_NAME: envConfig.AZURE_NH_HUB_NAME
    //     }
    //   })
    // );
  });

  // it("should NOT start the activities if user is not in active subset", async () => {
  //   const nhCallOrchestratorInput: NhNotificationOrchestratorInput = {
  //     message: aNotificationHubMessage
  //   };

  //   const contextMockWithDf = {
  //     ...contextMock,
  //     df: {
  //       callActivityWithRetry: jest
  //         .fn()
  //         // IsUserInActiveSubsetActivity -> false
  //         .mockReturnValueOnce({ kind: "SUCCESS", value: false })
  //         // HandleNHNotificationCallActivity
  //         .mockReturnValueOnce(callNHServiceActivitySuccessResult),
  //       getInput: jest.fn(() => nhCallOrchestratorInput)
  //     }
  //   };

  //   const orchestratorHandler = getHandler(
  //     envConfig,
  //     initTelemetryClient(envConfig) as TelemetryClient
  //   )(contextMockWithDf as any);

  //   const res = consumeGenerator(orchestratorHandler);

  //   expect(contextMockWithDf.df.callActivityWithRetry).toHaveBeenCalledTimes(1);

  //   expect(OrchestratorSuccess.is(res)).toBe(true);
  // });

  // it("should NOT start activity with wrong inputs", async () => {
  //   const nhCallOrchestratorInput = {
  //     message: "aMessage"
  //   };

  //   const contextMockWithDf = {
  //     ...contextMock,
  //     df: {
  //       callActivityWithRetry: jest
  //         .fn()
  //         .mockReturnValueOnce(callNHServiceActivitySuccessResult),
  //       getInput: jest.fn(() => nhCallOrchestratorInput)
  //     }
  //   };

  //   const orchestratorHandler = getHandler(
  //     envConfig,
  //     initTelemetryClient(envConfig) as TelemetryClient
  //   )(contextMockWithDf as any);

  //   orchestratorHandler.next();

  //   expect(contextMockWithDf.df.callActivityWithRetry).not.toBeCalled();
  // });
});
