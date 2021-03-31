/* tslint:disable: no-any */
// tslint:disable-next-line: no-object-mutation
import { NonEmptyString } from "italia-ts-commons/lib/strings";
import { context as contextMock } from "../../__mocks__/durable-functions";
import { PlatformEnum } from "../../generated/backend/Platform";
import { CreateOrUpdateInstallationMessage } from "../../generated/notifications/CreateOrUpdateInstallationMessage";
import { getCallNHServiceActivityHandler } from "../handler";
import { HandleNHNotificationCallActivityInput as NHServiceActivityInput } from "../handler";

import * as azure from "azure-sb";
import { DeleteInstallationMessage } from "../../generated/notifications/DeleteInstallationMessage";
import { NotifyMessage } from "../../generated/notifications/NotifyMessage";

import * as notificationhubServicePartition from "../../utils/notificationhubServicePartition";
import { NotificationHubConfig } from "../../utils/notificationhubServicePartition";

import { envConfig } from "../../__mocks__/env-config.mock";
import { NotificationHubService } from "azure-sb";
import { ActivityResultFailure } from "../../utils/durable/activities";

const createOrUpdateInstallationSpy = jest
  .spyOn(azure.NotificationHubService.prototype, "createOrUpdateInstallation")
  .mockImplementation((_, cb) =>
    cb(new Error("createOrUpdateInstallation error"))
  );

const notifySpy = jest
  .spyOn(azure.NotificationHubService.prototype, "send")
  .mockImplementation((_, __, ___, cb) =>
    cb(new Error("notify error"), {} as any)
  );

const deleteInstallationSpy = jest
  .spyOn(azure.NotificationHubService.prototype, "deleteInstallation")
  .mockImplementation((_, cb) => cb(new Error("deleteInstallation error")));

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

const aNotifyMessage: NotifyMessage = {
  installationId: aFiscalCodeHash,
  kind: "Notify" as any,
  payload: {
    message: "message",
    message_id: "id",
    title: "title"
  }
};

const aDeleteInStalltionMessage: DeleteInstallationMessage = {
  installationId: aFiscalCodeHash,
  kind: "DeleteInstallation" as any
};

const aNHConfig = NotificationHubConfig.decode({
  AZURE_NH_ENDPOINT: envConfig.AZURE_NH_ENDPOINT,
  AZURE_NH_HUB_NAME: envConfig.AZURE_NH_HUB_NAME
}).getOrElseL(() => {
  throw new Error(`Cannot decode aNHConfig`);
});

const mockTelemetryClient = ({ trackEvent: () => {} } as unknown) as Parameters<
  typeof getCallNHServiceActivityHandler
>[0];

/**
 * Spy on `buildNHService` to return a mocked `NotificationHubService`
 */
const buildNHServiceMock = jest
  .spyOn(notificationhubServicePartition, "buildNHService")
  .mockImplementation((c: NotificationHubConfig) => {
    return ({
      createOrUpdateInstallation: createOrUpdateInstallationSpy,
      send: notifySpy,
      deleteInstallation: deleteInstallationSpy
    } as unknown) as NotificationHubService;
  });

describe("HandleNHNotificationCallActivity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should call notificationhubServicePartion.buildNHService to get the right notificationService to call", async () => {
    const handler = getCallNHServiceActivityHandler(mockTelemetryClient);
    const input = NHServiceActivityInput.encode({
      message: aDeleteInStalltionMessage,
      notificationHubConfig: aNHConfig
    });
    expect.assertions(2);
    await handler(contextMock as any, input);
    expect(buildNHServiceMock).toHaveBeenCalledTimes(1);
    expect(buildNHServiceMock).toBeCalledWith(aNHConfig);
  });

  it("should trigger a retry if CreateOrUpdateInstallation fails", async () => {
    const handler = getCallNHServiceActivityHandler(mockTelemetryClient);
    const input = NHServiceActivityInput.encode({
      message: aCreateOrUpdateInstallationMessage,
      notificationHubConfig: aNHConfig
    });

    expect.assertions(2);
    try {
      await handler(contextMock as any, input);
    } catch (e) {
      expect(createOrUpdateInstallationSpy).toHaveBeenCalledTimes(1);
      expect(e).toBeInstanceOf(Error);
    }
  });

  it("should trigger a retry if notify fails", async () => {
    const handler = getCallNHServiceActivityHandler(mockTelemetryClient);
    const input = NHServiceActivityInput.encode({
      message: aNotifyMessage,
      notificationHubConfig: aNHConfig
    });
    expect.assertions(2);
    try {
      await handler(contextMock as any, input);
    } catch (e) {
      expect(notifySpy).toHaveBeenCalledTimes(1);
      expect(e).toBeInstanceOf(Error);
    }
  });

  it("should NOT trigger a retry if deleteInstallation fails", async () => {
    const handler = getCallNHServiceActivityHandler(mockTelemetryClient);
    const input = NHServiceActivityInput.encode({
      notificationHubConfig: aNHConfig,
      message: aDeleteInStalltionMessage
    });
    const res = await handler(contextMock as any, input);
    expect(deleteInstallationSpy).toHaveBeenCalledTimes(1);
    expect(ActivityResultFailure.is(res)).toBeTruthy();
  });
});
