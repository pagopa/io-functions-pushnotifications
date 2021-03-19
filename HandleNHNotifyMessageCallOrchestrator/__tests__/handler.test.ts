// tslint:disable:no-any

import { NonEmptyString } from "italia-ts-commons/lib/strings";
import { context as contextMock } from "../../__mocks__/durable-functions";
import { success } from "../../utils/activity";

import { KindEnum as NotifyMessageKind } from "../../generated/notifications/NotifyMessage";
import { NotifyMessage } from "../../generated/notifications/NotifyMessage";

import { ActivityInput as NHCallServiceActivityInput } from "../../HandleNHNotifyMessageCallActivity/handler";

import { getHandler, NhNotifyMessageOrchestratorCallInput } from "../handler";

import { envConfig } from "../../__mocks__/env-config.mock";

const aFiscalCodeHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" as NonEmptyString;

const aNotifyMessage: NotifyMessage = {
  installationId: aFiscalCodeHash,
  kind: NotifyMessageKind.Notify,
  payload: {
    message: "message",
    message_id: "id",
    title: "title"
  }
};

const RETRY_ATTEMPT_NUMBER = 1;
const retryOptions = {
  backoffCoefficient: 1.5
};

const callNHServiceActivitySuccessResult = success();

describe("HandleNHNotifyMessageCallOrchestrator", () => {
  it("should start the activities with the right inputs", async () => {
    const nhCallOrchestratorInput = NhNotifyMessageOrchestratorCallInput.encode(
      {
        message: aNotifyMessage
      }
    );

    const contextMockWithDf = {
      ...contextMock,
      df: {
        callActivityWithRetry: jest
          .fn()
          .mockReturnValueOnce(callNHServiceActivitySuccessResult),
        getInput: jest.fn(() => nhCallOrchestratorInput)
      }
    };

    const orchestratorHandler = getHandler(envConfig)(contextMockWithDf as any);

    orchestratorHandler.next();

    expect(contextMockWithDf.df.callActivityWithRetry).toBeCalledWith(
      "HandleNHNotifyMessageCallActivity",
      retryOptions,
      NHCallServiceActivityInput.encode({
        message: aNotifyMessage,
        notificationHubConfig: {
          AZURE_NH_ENDPOINT: envConfig.AZURE_NH_ENDPOINT,
          AZURE_NH_HUB_NAME: envConfig.AZURE_NH_HUB_NAME
        }
      })
    );
  });

  it("should not start activity with wrong inputs", async () => {
    const nhCallOrchestratorInput = {
      message: "aMessage"
    };

    const contextMockWithDf = {
      ...contextMock,
      df: {
        callActivityWithRetry: jest
          .fn()
          .mockReturnValueOnce(callNHServiceActivitySuccessResult),
        getInput: jest.fn(() => nhCallOrchestratorInput)
      }
    };

    const orchestratorHandler = getHandler(envConfig)(contextMockWithDf as any);

    orchestratorHandler.next();

    expect(contextMockWithDf.df.callActivityWithRetry).not.toBeCalled();
  });
});
