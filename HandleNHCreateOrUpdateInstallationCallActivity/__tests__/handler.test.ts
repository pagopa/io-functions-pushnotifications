// tslint:disable:no-any
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { context as contextMock } from "../../__mocks__/durable-functions";
import {
  getActivityBody,
  ActivityInput,
  ActivityResultSuccess
} from "../handler";

import { PlatformEnum } from "../../generated/notifications/Platform";
import { CreateOrUpdateInstallationMessage } from "../../generated/notifications/CreateOrUpdateInstallationMessage";

import { NotificationHubConfig } from "../../utils/notificationhubServicePartition";

import { envConfig } from "../../__mocks__/env-config.mock";
import { createActivity } from "../../utils/durable/activities";
import { NotificationHubsClient } from "@azure/notification-hubs";

const activityName = "any";

const aFiscalCodeHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" as NonEmptyString;
const aPushChannel =
  "fLKP3EATnBI:APA91bEy4go681jeSEpLkNqhtIrdPnEKu6Dfi-STtUiEnQn8RwMfBiPGYaqdWrmzJyXIh5Yms4017MYRS9O1LGPZwA4sOLCNIoKl4Fwg7cSeOkliAAtlQ0rVg71Kr5QmQiLlDJyxcq3p";

const aCreateOrUpdateInstallationMessage: CreateOrUpdateInstallationMessage = {
  installationId: aFiscalCodeHash,
  kind: "CreateOrUpdateInstallation" as any,
  platform: PlatformEnum.apns,
  pushChannel: aPushChannel,
  tags: [aFiscalCodeHash]
};

const aNHConfig = {
  AZURE_NH_ENDPOINT: envConfig.AZURE_NH_ENDPOINT,
  AZURE_NH_HUB_NAME: envConfig.AZURE_NH_HUB_NAME
} as NotificationHubConfig;

const mockNotificationHubService = {
  createOrUpdateInstallation: jest.fn()
};
const mockBuildNHService = jest
  .fn()
  .mockImplementation(
    _ => (mockNotificationHubService as unknown) as NotificationHubsClient
  );

const handler = createActivity(
  activityName,
  ActivityInput, // FIXME: the editor marks it as type error, but tests compile correctly
  ActivityResultSuccess,
  getActivityBody(mockBuildNHService)
);

describe("HandleNHCreateOrUpdateInstallationCallActivity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should call notificationhubServicePartion.buildNHService to get the right notificationService to call", async () => {
    mockNotificationHubService.createOrUpdateInstallation = jest
      .fn()
      .mockImplementation((_, cb) => cb());

    const input = ActivityInput.encode({
      installationId: aCreateOrUpdateInstallationMessage.installationId,
      platform: aCreateOrUpdateInstallationMessage.platform,
      tags: aCreateOrUpdateInstallationMessage.tags,
      pushChannel: aCreateOrUpdateInstallationMessage.pushChannel,
      notificationHubConfig: aNHConfig
    });

    expect.assertions(3);

    const res = await handler(contextMock as any, input);
    expect(ActivityResultSuccess.is(res)).toBeTruthy();

    expect(mockBuildNHService).toHaveBeenCalledTimes(1);
    expect(mockBuildNHService).toBeCalledWith(aNHConfig);
  });

  it("should trigger a retry if CreateOrUpdateInstallation fails", async () => {
    mockNotificationHubService.createOrUpdateInstallation = jest
      .fn()
      .mockImplementation((_, cb) =>
        cb(new Error("createOrUpdateInstallation error"))
      );

    const input = ActivityInput.encode({
      installationId: aCreateOrUpdateInstallationMessage.installationId,
      platform: aCreateOrUpdateInstallationMessage.platform,
      tags: aCreateOrUpdateInstallationMessage.tags,
      pushChannel: aCreateOrUpdateInstallationMessage.pushChannel,
      notificationHubConfig: aNHConfig
    });

    expect.assertions(2);

    try {
      await handler(contextMock as any, input);
    } catch (e) {
      expect(
        mockNotificationHubService.createOrUpdateInstallation
      ).toHaveBeenCalledTimes(1);
      expect(e).toBeInstanceOf(Error);
    }
  });
});
