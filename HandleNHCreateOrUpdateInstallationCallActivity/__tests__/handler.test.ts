// tslint:disable:no-any
import { NonEmptyString } from "italia-ts-commons/lib/strings";
import { context as contextMock } from "../../__mocks__/durable-functions";
import { activityBody, ActivityInput, ActivityResultSuccess } from "../handler";

import * as azure from "azure-sb";
import { PlatformEnum } from "../../generated/backend/Platform";
import { CreateOrUpdateInstallationMessage } from "../../generated/notifications/CreateOrUpdateInstallationMessage";

import * as notificationhubServicePartition from "../../utils/notificationhubServicePartition";
import { NotificationHubConfig } from "../../utils/notificationhubServicePartition";

import { envConfig } from "../../__mocks__/env-config.mock";
import { Azure, NotificationHubService } from "azure-sb";
import { createActivity } from "../../utils/durable/activities";

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

const createOrUpdateInstallation_WithError_Mock = jest
  .spyOn(azure.NotificationHubService.prototype, "createOrUpdateInstallation")
  .mockImplementation((_, cb) =>
    cb(new Error("createOrUpdateInstallation error"))
  );

const aNHConfig = {
  AZURE_NH_ENDPOINT: envConfig.AZURE_NH_ENDPOINT,
  AZURE_NH_HUB_NAME: envConfig.AZURE_NH_HUB_NAME
} as NotificationHubConfig;

/**
 * Spy on `buildNHService` to return a mocked `NotificationHubService`
 */
const buildNHServiceMockBuilder = func =>
  jest
    .spyOn(notificationhubServicePartition, "buildNHService")
    .mockImplementation((c: NotificationHubConfig) => {
      return ({
        createOrUpdateInstallation: func
      } as undefined) as NotificationHubService;
    });

const handler = createActivity(
  activityName,
  ActivityInput, // FIXME: the editor marks it as type error, but tests compile correctly
  ActivityResultSuccess,
  activityBody
);

describe("HandleNHCreateOrUpdateInstallationCallActivity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should call notificationhubServicePartion.buildNHService to get the right notificationService to call", async () => {
    const buildNHServiceMock = buildNHServiceMockBuilder(
      jest
        .fn()
        .mockImplementation((_, cb: Azure.ServiceBus.ResponseCallback) =>
          cb(null, null)
        )
    );

    const input = ActivityInput.encode({
      installationId: aCreateOrUpdateInstallationMessage.installationId,
      platform: aCreateOrUpdateInstallationMessage.platform,
      tags: aCreateOrUpdateInstallationMessage.tags,
      pushChannel: aCreateOrUpdateInstallationMessage.pushChannel,
      notificationHubConfig: aNHConfig
    });

    expect.assertions(2);

    await handler(contextMock as any, input);

    expect(buildNHServiceMock).toHaveBeenCalledTimes(1);
    expect(buildNHServiceMock).toBeCalledWith(aNHConfig);
  });

  it("should trigger a retry if CreateOrUpdateInstallation fails", async () => {
    buildNHServiceMockBuilder(createOrUpdateInstallation_WithError_Mock);

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
      expect(createOrUpdateInstallation_WithError_Mock).toHaveBeenCalledTimes(
        1
      );
      expect(e).toBeInstanceOf(Error);
    }
  });
});
