// tslint:disable:no-any
import * as df from "durable-functions";

import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { context as contextMockBase } from "../../__mocks__/durable-functions";
import { KindEnum as DeleteKind } from "../../generated/notifications/DeleteInstallationMessage";

import { DeleteInstallationMessage } from "../../generated/notifications/DeleteInstallationMessage";

import {
  success as activitySuccess,
  success
} from "../../utils/durable/activities";
import { getHandler, OrchestratorCallInput } from "../handler";
import {
  OrchestratorInvalidInputFailure,
  success as orchestratorSuccess
} from "../../utils/durable/orchestrators";
import { NotificationHubConfig } from "../../utils/notificationhubServicePartition";

import { getMockDeleteInstallationActivity } from "../../__mocks__/activities-mocks";

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

const legacyNotificationHubConfig: NotificationHubConfig = {
  AZURE_NH_ENDPOINT: "foo" as NonEmptyString,
  AZURE_NH_HUB_NAME: "bar" as NonEmptyString
};
const newNotificationHubConfig: NotificationHubConfig = {
  AZURE_NH_ENDPOINT: "foo2" as NonEmptyString,
  AZURE_NH_HUB_NAME: "bar2" as NonEmptyString
};

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
      legacyNotificationHubConfig: legacyNotificationHubConfig,
      notificationHubConfigPartitionChooser: _ => newNotificationHubConfig
    })(contextMockWithDf as any);

    const result = consumeGenerator(orchestratorHandler);

    expect(result).toEqual(orchestratorSuccess());
  });

  it("should always call DeleteInstallation activity twice with both legacy and new parameters", async () => {
    const orchestratorHandler = getHandler({
      deleteInstallationActivity: mockDeleteInstallationActivitySuccess,
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
      legacyNotificationHubConfig: legacyNotificationHubConfig,
      notificationHubConfigPartitionChooser: _ => newNotificationHubConfig
    })(contextMockWithDf);

    expect.assertions(2);
    try {
      consumeGenerator(orchestratorHandler);
    } catch (err) {
      expect(OrchestratorInvalidInputFailure.is(err)).toBe(true);
      expect(contextMockWithDf.df.callActivityWithRetry).not.toBeCalled();
    }
  });
});
