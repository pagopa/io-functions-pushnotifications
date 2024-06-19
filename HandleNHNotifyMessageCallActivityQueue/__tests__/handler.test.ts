import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";

import { NotifyMessage } from "../../generated/notifications/NotifyMessage";

import { envConfig } from "../../__mocks__/env-config.mock";
import { TelemetryClient } from "applicationinsights";
import { NotificationHubConfig } from "../../utils/notificationhubServicePartition";
import { toSHA256 } from "../../utils/conversions";
import { handle } from "../handler";
import * as NSP from "../../utils/notificationhubServicePartition";
import { NotificationHubsClient } from "@azure/notification-hubs";

const aFiscalCodeHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" as NonEmptyString;

const aNotifyMessage: NotifyMessage = {
  installationId: aFiscalCodeHash,
  kind: "Notify" as any,
  payload: {
    message: "message",
    message_id: "id",
    title: "title"
  }
};

const aNHConfig = {
  AZURE_NH_ENDPOINT: envConfig.AZURE_NH_ENDPOINT,
  AZURE_NH_HUB_NAME: envConfig.AZURE_NH_HUB_NAME
} as NotificationHubConfig;

const legacyNotificationHubConfig: NotificationHubConfig = {
  AZURE_NH_ENDPOINT: "foo" as NonEmptyString,
  AZURE_NH_HUB_NAME: "bar" as NonEmptyString
};

const mockTelemetryClient = ({
  trackEvent: jest.fn(() => {})
} as unknown) as TelemetryClient;

const sendNotificationMock = jest.fn();
const getInstallationMock = jest.fn();

const mockNotificationHubService = {
  sendNotification: sendNotificationMock,
  getInstallation: getInstallationMock
};
const buildNHClient = jest
  .spyOn(NSP, "buildNHClient")
  .mockImplementation(
    () => (mockNotificationHubService as unknown) as NotificationHubsClient
  );

const aNotifyMessageToBlacklistedUser: NotifyMessage = {
  ...aNotifyMessage,
  installationId: toSHA256(
    envConfig.FISCAL_CODE_NOTIFICATION_BLACKLIST[0]
  ) as NonEmptyString
};

describe("HandleNHNotifyMessageCallActivityQueue", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should call notificationhubServicePartion.buildNHClient to get the right notificationService to call", async () => {
    getInstallationMock.mockReturnValueOnce(
      Promise.resolve({
        platform: "apns"
      })
    );
    sendNotificationMock.mockReturnValueOnce(Promise.resolve({}));

    const input = Buffer.from(
      JSON.stringify({
        message: aNotifyMessage,
        target: "current"
      })
    ).toString("base64");

    expect.assertions(3);

    const res = await handle(
      input,
      legacyNotificationHubConfig,
      () => aNHConfig,
      envConfig.FISCAL_CODE_NOTIFICATION_BLACKLIST,
      mockTelemetryClient
    );
    expect(res.kind).toEqual("SUCCESS");

    expect(sendNotificationMock).toHaveBeenCalledTimes(1);
    expect(buildNHClient).toBeCalledWith(aNHConfig);
  });

  it("should call notificationhubServicePartion.buildNHClient to get the legacy notificationService to call", async () => {
    getInstallationMock.mockReturnValueOnce(
      Promise.resolve({
        platform: "apns"
      })
    );
    sendNotificationMock.mockReturnValueOnce(Promise.resolve({}));

    const input = Buffer.from(
      JSON.stringify({
        message: aNotifyMessage,
        target: "legacy"
      })
    ).toString("base64");

    expect.assertions(3);

    const res = await handle(
      input,
      legacyNotificationHubConfig,
      () => aNHConfig,
      envConfig.FISCAL_CODE_NOTIFICATION_BLACKLIST,
      mockTelemetryClient
    );
    expect(res.kind).toEqual("SUCCESS");

    expect(sendNotificationMock).toHaveBeenCalledTimes(1);
    expect(buildNHClient).toBeCalledWith(legacyNotificationHubConfig);
  });

  it("should trigger a retry if notify fails", async () => {
    getInstallationMock.mockReturnValueOnce(
      Promise.resolve({
        platform: "apns"
      })
    );
    sendNotificationMock.mockImplementation((_, __, ___, cb) =>
      cb(new Error("send error"))
    );

    const input = Buffer.from(
      JSON.stringify({
        message: aNotifyMessage,
        target: "legacy"
      })
    ).toString("base64");

    await expect(
      handle(
        input,
        legacyNotificationHubConfig,
        () => aNHConfig,
        envConfig.FISCAL_CODE_NOTIFICATION_BLACKLIST,
        mockTelemetryClient
      )
    ).rejects.toEqual(expect.objectContaining({ kind: "TRANSIENT" }));
    expect(sendNotificationMock).toHaveBeenCalledTimes(1);
    expect(mockTelemetryClient.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.objectContaining({ isSuccess: "false" })
      })
    );
  });

  it("should not call notificationhubServicePartion.buildNHClient when using a blacklisted user", async () => {
    sendNotificationMock.mockImplementation((_1, _2, _3, cb) => cb());

    const input = Buffer.from(
      JSON.stringify({
        message: aNotifyMessageToBlacklistedUser,
        target: "current"
      })
    ).toString("base64");

    expect.assertions(3);

    const res = await handle(
      input,
      legacyNotificationHubConfig,
      () => aNHConfig,
      envConfig.FISCAL_CODE_NOTIFICATION_BLACKLIST,
      mockTelemetryClient
    );

    expect(res.kind).toEqual("SUCCESS");
    expect(res).toHaveProperty("skipped", true);

    expect(sendNotificationMock).not.toBeCalled();
  });
});
