// tslint:disable:no-any
import * as df from "durable-functions";
import * as o from "../../utils/durable/orchestrators";

import { NonEmptyString } from "italia-ts-commons/lib/strings";
import { context as contextMockBase } from "../../__mocks__/durable-functions";
import { KindEnum as DeleteKind } from "../../generated/notifications/DeleteInstallationMessage";

import { DeleteInstallationMessage } from "../../generated/notifications/DeleteInstallationMessage";

import {
  success as activitySuccess,
  success
} from "../../utils/durable/activities";
import { getHandler, OrchestratorCallInput } from "../handler";
import { envConfig } from "../../__mocks__/env-config.mock";
import {
  OrchestratorFailure,
  OrchestratorInvalidInputFailure,
  success as orchestratorSuccess
} from "../../utils/durable/orchestrators";
import { NotificationHubConfig } from "../../utils/notificationhubServicePartition";

import {
  getMockDeleteInstallationActivity,
  getMockIsUserATestUserActivity
} from "../../__mocks__/activities-mocks";

import { IOrchestrationFunctionContext } from "durable-functions/lib/src/iorchestrationfunctioncontext";
import { consumeGenerator } from "../../utils/durable/utils";

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

const legacyNotificationHubConfig: NotificationHubConfig = {
  AZURE_NH_ENDPOINT: "foo" as NonEmptyString,
  AZURE_NH_HUB_NAME: "bar" as NonEmptyString
};
const newNotificationHubConfig: NotificationHubConfig = {
  AZURE_NH_ENDPOINT: "foo2" as NonEmptyString,
  AZURE_NH_HUB_NAME: "bar2" as NonEmptyString
};

const mockIsUserATestUserActivityTrue = getMockIsUserATestUserActivity(true);
const mockIsUserATestUserActivityFalse = getMockIsUserATestUserActivity(false);
const mockDeleteInstallationActivitySuccess = getMockDeleteInstallationActivity(
  success()
);

const mockGetInput = jest.fn<unknown, []>(() => nhCallOrchestratorInput);
const contextMockWithDf = ({
  ...contextMockBase,
  df: {
    callActivityWithRetry: jest.fn().mockReturnValue(activitySuccess()),
    getInput: mockGetInput,
    setCustomStatus: jest.fn()
  }
} as unknown) as IOrchestrationFunctionContext;

describe("HandleNHDeleteInstallationCallOrchestrator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it("should start the activities with the right inputs", async () => {
    const orchestratorHandler = getHandler({
      deleteInstallationActivity: mockDeleteInstallationActivitySuccess,
      isUserInActiveTestSubsetActivity: mockIsUserATestUserActivityFalse,
      legacyNotificationHubConfig: legacyNotificationHubConfig,
      notificationHubConfigPartitionChooser: _ => newNotificationHubConfig
    })(contextMockWithDf as any);

    consumeGenerator(orchestratorHandler);

    expect(mockDeleteInstallationActivitySuccess).toBeCalledWith(
      expect.any(Object),
      expect.objectContaining({
        installationId: aDeleteNotificationHubMessage.installationId,
        notificationHubConfig: legacyNotificationHubConfig
      })
    );
  });

  it("should end the activity with SUCCESS", async () => {
    const orchestratorHandler = getHandler({
      deleteInstallationActivity: mockDeleteInstallationActivitySuccess,
      isUserInActiveTestSubsetActivity: mockIsUserATestUserActivityFalse,
      legacyNotificationHubConfig: legacyNotificationHubConfig,
      notificationHubConfigPartitionChooser: _ => newNotificationHubConfig
    })(contextMockWithDf as any);

    const result = consumeGenerator(orchestratorHandler);

    expect(result).toEqual(orchestratorSuccess());
  });

  it("should call DeleteInstallation activity one time with legacy parameters, if user is NOT a test user", async () => {
    const orchestratorHandler = getHandler({
      deleteInstallationActivity: mockDeleteInstallationActivitySuccess,
      isUserInActiveTestSubsetActivity: mockIsUserATestUserActivityFalse,
      legacyNotificationHubConfig: legacyNotificationHubConfig,
      notificationHubConfigPartitionChooser: _ => newNotificationHubConfig
    })(contextMockWithDf as any);

    consumeGenerator(orchestratorHandler);

    expect(mockDeleteInstallationActivitySuccess).toHaveBeenCalledTimes(1);
    expect(mockDeleteInstallationActivitySuccess).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        installationId: aDeleteNotificationHubMessage.installationId,
        notificationHubConfig: legacyNotificationHubConfig
      })
    );
  });

  it("should call DeleteInstallation activity twice with both legacy and new parameters, if user is a test user", async () => {
    const orchestratorHandler = getHandler({
      deleteInstallationActivity: mockDeleteInstallationActivitySuccess,
      isUserInActiveTestSubsetActivity: mockIsUserATestUserActivityTrue,
      legacyNotificationHubConfig: legacyNotificationHubConfig,
      notificationHubConfigPartitionChooser: _ => newNotificationHubConfig
    })(contextMockWithDf as any);

    consumeGenerator(orchestratorHandler);

    expect(mockDeleteInstallationActivitySuccess).toHaveBeenCalledTimes(2);
    expect(mockDeleteInstallationActivitySuccess).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        installationId: aDeleteNotificationHubMessage.installationId,
        notificationHubConfig: legacyNotificationHubConfig
      })
    );
    expect(mockDeleteInstallationActivitySuccess).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        installationId: aDeleteNotificationHubMessage.installationId,
        notificationHubConfig: newNotificationHubConfig
      })
    );
  });

  it("should not start activity with wrong inputs", async () => {
    const nhCallOrchestratorInput = {
      message: "aMessage"
    };

    mockGetInput.mockImplementationOnce(() => nhCallOrchestratorInput);

    const orchestratorHandler = getHandler({
      deleteInstallationActivity: mockDeleteInstallationActivitySuccess,
      isUserInActiveTestSubsetActivity: mockIsUserATestUserActivityFalse,
      legacyNotificationHubConfig: legacyNotificationHubConfig,
      notificationHubConfigPartitionChooser: _ => newNotificationHubConfig
    })(contextMockWithDf as any);

    expect.assertions(2);
    try {
      consumeGenerator(orchestratorHandler);
    } catch (err) {
      expect(OrchestratorInvalidInputFailure.is(err)).toBe(true);
      expect(contextMockWithDf.df.callActivityWithRetry).not.toBeCalled();
    }
  });
});
