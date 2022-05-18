import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";

import * as azure from "azure-sb";
import { NotifyMessage } from "../../generated/notifications/NotifyMessage";

import { envConfig } from "../../__mocks__/env-config.mock";
import { TelemetryClient } from "applicationinsights";
import { NotificationHubConfig } from "../../utils/notificationhubServicePartition";
import { toSHA256 } from "../../utils/conversions";
import { handle } from "../handler";
import * as NSP from "../../utils/notificationhubServicePartition";
import { NhNotifyMessageRequest } from "../../utils/types";

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
  trackEvent: () => {}
} as unknown) as TelemetryClient;

const mockNotificationHubService = {
  send: jest.fn()
};
const buildNHService = jest
  .spyOn(NSP, "buildNHService")
  .mockImplementation(
    () =>
      (mockNotificationHubService as unknown) as azure.NotificationHubService
  );

const aNotifyMessageToBlacklistedUser: NotifyMessage = {
  ...aNotifyMessage,
  installationId: toSHA256(
    envConfig.FISCAL_CODE_NOTIFICATION_BLACKLIST[0]
  ) as NonEmptyString
};

describe("HandleNHNotifyMessageCallActivity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should call notificationhubServicePartion.buildNHService to get the right notificationService to call", async () => {
    mockNotificationHubService.send = jest
      .fn()
      .mockImplementation((_1, _2, _3, cb) => cb());

    const input = NhNotifyMessageRequest.encode({
      message: aNotifyMessage,
      target: "current"
    });

    expect.assertions(3);

    const res = await handle(
      input,
      legacyNotificationHubConfig,
      () => aNHConfig,
      envConfig.FISCAL_CODE_NOTIFICATION_BLACKLIST,
      mockTelemetryClient
    );
    expect(res.kind).toEqual("SUCCESS");

    expect(mockNotificationHubService.send).toHaveBeenCalledTimes(1);
    expect(buildNHService).toBeCalledWith(aNHConfig);
  });

  it("should call notificationhubServicePartion.buildNHService to get the legacy notificationService to call", async () => {
    mockNotificationHubService.send = jest
      .fn()
      .mockImplementation((_1, _2, _3, cb) => cb());

    const input = NhNotifyMessageRequest.encode({
      message: aNotifyMessage,
      target: "legacy"
    });

    expect.assertions(3);

    const res = await handle(
      input,
      legacyNotificationHubConfig,
      () => aNHConfig,
      envConfig.FISCAL_CODE_NOTIFICATION_BLACKLIST,
      mockTelemetryClient
    );
    expect(res.kind).toEqual("SUCCESS");

    expect(mockNotificationHubService.send).toHaveBeenCalledTimes(1);
    expect(buildNHService).toBeCalledWith(legacyNotificationHubConfig);
  });

  it("should trigger a retry if notify fails", async () => {
    mockNotificationHubService.send = jest
      .fn()
      .mockImplementation((_, __, ___, cb) => cb(new Error("send error")));

    const input = NhNotifyMessageRequest.encode({
      message: aNotifyMessage,
      target: "current"
    });

    await expect(
      handle(
        input,
        legacyNotificationHubConfig,
        () => aNHConfig,
        envConfig.FISCAL_CODE_NOTIFICATION_BLACKLIST,
        mockTelemetryClient
      )
    ).rejects.toEqual(expect.objectContaining({ kind: "TRANSIENT" }));
    expect(mockNotificationHubService.send).toHaveBeenCalledTimes(1);
  });

  it("should not call notificationhubServicePartion.buildNHService when using a blacklisted user", async () => {
    mockNotificationHubService.send = jest
      .fn()
      .mockImplementation((_1, _2, _3, cb) => cb());

    const input = NhNotifyMessageRequest.encode({
      message: aNotifyMessageToBlacklistedUser,
      target: "current"
    });

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

    expect(mockNotificationHubService.send).not.toBeCalled();
  });
});
