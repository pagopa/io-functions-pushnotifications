// tslint:disable:no-any
import * as df from "durable-functions";
import * as o from "../../utils/durable/orchestrators";

import { NonEmptyString } from "italia-ts-commons/lib/strings";
import { context as contextMockBase } from "../../__mocks__/durable-functions";
import { KindEnum as DeleteKind } from "../../generated/notifications/DeleteInstallationMessage";

import { DeleteInstallationMessage } from "../../generated/notifications/DeleteInstallationMessage";
import {
  ActivityInput as NHCallServiceActivityInput,
  ActivityName
} from "../../HandleNHDeleteInstallationCallActivity/handler";
import {
  ActivityResultSuccess,
  success as activitySuccess
} from "../../utils/durable/activities";
import { getHandler, OrchestratorCallInput } from "../handler";
import { envConfig } from "../../__mocks__/env-config.mock";
import {
  CallableActivity,
  OrchestratorFailure,
  success as orchestratorSuccess
} from "../../utils/durable/orchestrators";
import { NotificationHubConfig } from "../../utils/notificationhubServicePartition";

import { ActivityInput as DeleteInstallationActivityInput } from "../../HandleNHDeleteInstallationCallActivity";
import {
  ActivityInput as IsUserInActiveSubsetActivityInput,
  ActivityResultSuccessWithValue as IsUserInActiveSubsetActivityResultSuccess
} from "../../IsUserInActiveSubsetActivity";

import { IOrchestrationFunctionContext } from "durable-functions/lib/src/iorchestrationfunctioncontext";
import { readableReport } from "italia-ts-commons/lib/reporters";

const aFiscalCodeHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" as NonEmptyString;
const anInstallationId = aFiscalCodeHash;

const aDeleteNotificationHubMessage: DeleteInstallationMessage = {
  installationId: anInstallationId,
  kind: DeleteKind.DeleteInstallation
};

const nhCallOrchestratorInput = OrchestratorCallInput.encode({
  message: aDeleteNotificationHubMessage
});

const retryOptions = {
  ...new df.RetryOptions(5000, envConfig.RETRY_ATTEMPT_NUMBER),
  backoffCoefficient: 1.5
};

const aNotificationHubConfig = NotificationHubConfig.decode({
  AZURE_NH_ENDPOINT: envConfig.AZURE_NH_ENDPOINT,
  AZURE_NH_HUB_NAME: envConfig.AZURE_NH_HUB_NAME
}).getOrElseL(err => {
  throw new Error(
    `Cannot decode aNotificationHubConfig: ${readableReport(err)}`
  );
});

const deleteInstallationActivity = o.callableActivity<
  DeleteInstallationActivityInput
>(ActivityName, ActivityResultSuccess, retryOptions);

type CallableIsUserInActiveSubsetActivity = CallableActivity<
  IsUserInActiveSubsetActivityInput,
  IsUserInActiveSubsetActivityResultSuccess
>;

const getMockIsUserATestUserActivity = (res: boolean) =>
  jest.fn<
    ReturnType<CallableIsUserInActiveSubsetActivity>,
    Parameters<CallableIsUserInActiveSubsetActivity>
  >(function*() {
    return { kind: "SUCCESS", value: res };
  });

const mockGetInput = jest.fn<unknown, []>(() => nhCallOrchestratorInput);
const contextMockWithDf = ({
  ...contextMockBase,
  df: {
    callActivityWithRetry: jest.fn().mockReturnValue(activitySuccess()),
    getInput: mockGetInput
  }
} as unknown) as IOrchestrationFunctionContext;

describe("HandleNHDeleteInstallationCallOrchestrator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it("should start the activities with the right inputs", async () => {
    const mockIsUserATestUserActivity = getMockIsUserATestUserActivity(true);

    const orchestratorHandler = getHandler({
      deleteInstallationActivity,
      isUserInActiveTestSubsetActivity: mockIsUserATestUserActivity,
      legacyNotificationHubConfig: aNotificationHubConfig
    })(contextMockWithDf as any);

    // call orchestrator 1 time
    orchestratorHandler.next();

    expect(contextMockWithDf.df.callActivityWithRetry).toBeCalledWith(
      "HandleNHDeleteInstallationCallActivity",
      retryOptions,
      NHCallServiceActivityInput.encode({
        installationId: anInstallationId,
        notificationHubConfig: {
          AZURE_NH_ENDPOINT: envConfig.AZURE_NH_ENDPOINT,
          AZURE_NH_HUB_NAME: envConfig.AZURE_NH_HUB_NAME
        }
      })
    );
  });

  it("should end the activity with SUCCESS in two steps", async () => {
    const mockIsUserATestUserActivity = getMockIsUserATestUserActivity(true);

    const orchestratorHandler = getHandler({
      deleteInstallationActivity,
      isUserInActiveTestSubsetActivity: mockIsUserATestUserActivity,
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

    const mockIsUserATestUserActivity = getMockIsUserATestUserActivity(true);

    const orchestratorHandler = getHandler({
      deleteInstallationActivity,
      isUserInActiveTestSubsetActivity: mockIsUserATestUserActivity,
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
