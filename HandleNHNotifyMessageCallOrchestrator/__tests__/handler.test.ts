// tslint:disable:no-any
import * as df from "durable-functions";

import { NonEmptyString } from "italia-ts-commons/lib/strings";
import { context as contextMock } from "../../__mocks__/durable-functions";
import {
  retryActivity,
  success as activitySuccess
} from "../../utils/durable/activities";

import { KindEnum as NotifyMessageKind } from "../../generated/notifications/NotifyMessage";
import { NotifyMessage } from "../../generated/notifications/NotifyMessage";

import {
  ActivityInput as NHCallServiceActivityInput,
  ActivityBodyImpl as NotifyMessageActivityBodyImpl,
  ActivityResultSuccess as NotifyMessageActivityResultSuccess
} from "../../HandleNHNotifyMessageCallActivity/handler";

import { getHandler, NhNotifyMessageOrchestratorCallInput } from "../handler";

import { envConfig } from "../../__mocks__/env-config.mock";
import {
  callableActivity,
  OrchestratorFailure,
  OrchestratorSuccess,
  success as orchestratorSuccess
} from "../../utils/durable/orchestrators";
import { IOrchestrationFunctionContext } from "durable-functions/lib/src/iorchestrationfunctioncontext";
import { NotificationHubConfig } from "../../utils/notificationhubServicePartition";

const aNotificationHubConfig: NotificationHubConfig = {
  AZURE_NH_ENDPOINT: envConfig.AZURE_NH_ENDPOINT,
  AZURE_NH_HUB_NAME: envConfig.AZURE_NH_HUB_NAME
};

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

const nhCallOrchestratorInput = NhNotifyMessageOrchestratorCallInput.encode({
  message: aNotifyMessage
});

const retryOptions = {
  ...new df.RetryOptions(5000, envConfig.RETRY_ATTEMPT_NUMBER),
  backoffCoefficient: 1.5
};

const notifyMessageActivity = callableActivity<NotifyMessageActivityBodyImpl>(
  "HandleNHNotifyMessageCallActivity",
  NotifyMessageActivityResultSuccess,
  retryOptions
);

const mockGetInput = jest.fn<unknown, []>(() => nhCallOrchestratorInput);
const contextMockWithDf = ({
  ...contextMock,
  df: {
    callActivityWithRetry: jest.fn().mockReturnValue(activitySuccess()),
    getInput: mockGetInput
  }
} as unknown) as IOrchestrationFunctionContext;

describe("HandleNHNotifyMessageCallOrchestrator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should start the activities with the right inputs", async () => {
    const orchestratorHandler = getHandler({
      notifyMessageActivity,
      legacyNotificationHubConfig: aNotificationHubConfig
    })(contextMockWithDf as any);

    // call orchestrator 1 time
    orchestratorHandler.next();

    expect(contextMockWithDf.df.callActivityWithRetry).toBeCalledWith(
      "HandleNHNotifyMessageCallActivity",
      retryOptions,
      NHCallServiceActivityInput.encode({
        message: aNotifyMessage,
        notificationHubConfig: aNotificationHubConfig
      })
    );
  });

  it("should end the activity with SUCCESS in two steps", async () => {
    const orchestratorHandler = getHandler({
      notifyMessageActivity,
      legacyNotificationHubConfig: aNotificationHubConfig
    })(contextMockWithDf as any);

    // call orchestrator 1 time
    const res = orchestratorHandler.next();
    expect(res.done).toBeFalsy();

    // call orchestrator 2nd time (expected to be the last one)
    const res2 = orchestratorHandler.next(res.value as any);
    expect(res2.done).toBeTruthy();

    expect(res2.value).toEqual(orchestratorSuccess());
  });

  it("should not start activity with wrong inputs", async () => {
    const nhCallOrchestratorInput = {
      message: "aMessage"
    };

    mockGetInput.mockImplementationOnce(() => nhCallOrchestratorInput);

    const orchestratorHandler = getHandler({
      notifyMessageActivity,
      legacyNotificationHubConfig: aNotificationHubConfig
    })(contextMockWithDf as any);

    var res = orchestratorHandler.next();

    expect(res.done).toBeTruthy();
    expect((res.value as OrchestratorFailure).kind).toEqual(
      "FAILURE_INVALID_INPUT"
    );
    expect(contextMockWithDf.df.callActivityWithRetry).not.toBeCalled();
  });
});
