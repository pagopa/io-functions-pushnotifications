// tslint:disable:no-any

import { NonEmptyString } from "italia-ts-commons/lib/strings";
import { context as contextMock } from "../../__mocks__/durable-functions";
import {
  getActivityBody,
  ActivityBodyImpl,
  ActivityInput,
  ActivityResultSuccess
} from "../handler";

import * as azure from "azure-sb";
import { DeleteInstallationMessage } from "../../generated/notifications/DeleteInstallationMessage";

import { envConfig } from "../../__mocks__/env-config.mock";
import { NotificationHubConfig } from "../../utils/notificationhubServicePartition";
import { createActivity, success } from "../../utils/durable/activities";
import { activityName } from "..";

const aFiscalCodeHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" as NonEmptyString;

const anInstallationId = aFiscalCodeHash;

const aDeleteInStalltionMessage: DeleteInstallationMessage = {
  installationId: aFiscalCodeHash,
  kind: "DeleteInstallation" as any
};

const aNHConfig = {
  AZURE_NH_ENDPOINT: envConfig.AZURE_NH_ENDPOINT,
  AZURE_NH_HUB_NAME: envConfig.AZURE_NH_HUB_NAME
} as NotificationHubConfig;

const mockBuildNHService = jest
  .fn()
  .mockImplementation(
    _ => (mockNotificationHubService as unknown) as azure.NotificationHubService
  );
const mockNotificationHubService = {
  deleteInstallation: jest.fn()
};

const handler = createActivity(
  activityName,
  ActivityInput, // FIXME: the editor marks it as type error, but tests compile correctly
  ActivityResultSuccess,
  getActivityBody(mockBuildNHService)
);

describe("HandleNHDeleteInstallationCallActivity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it("should call deleteInstallation with right NH parameters", async () => {
    mockNotificationHubService.deleteInstallation = jest
      .fn()
      .mockImplementation((_, cb) => cb());

    const input = ActivityInput.encode({
      installationId: anInstallationId,
      notificationHubConfig: aNHConfig
    });
    const res = await handler(contextMock as any, input);
    expect(mockNotificationHubService.deleteInstallation).toHaveBeenCalledTimes(
      1
    );

    expect(mockBuildNHService).toHaveBeenCalledWith(aNHConfig);

    expect(res.kind).toEqual("SUCCESS");
  });

  it("should NOT trigger a retry if deleteInstallation fails", async () => {
    mockNotificationHubService.deleteInstallation = jest
      .fn()
      .mockImplementation((_, cb) => cb(new Error("deleteInstallation error")));

    const input = ActivityInput.encode({
      installationId: anInstallationId,
      notificationHubConfig: aNHConfig
    });
    const res = await handler(contextMock as any, input);
    expect(mockNotificationHubService.deleteInstallation).toHaveBeenCalledTimes(
      1
    );
    expect(res.kind).toEqual("FAILURE");
  });
});
