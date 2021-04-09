// tslint:disable:no-any

import { NonEmptyString } from "italia-ts-commons/lib/strings";
import { context as contextMock } from "../../__mocks__/durable-functions";
import { ActivityInput, getActivityBody } from "../handler";
import { ActivityInput as NHServiceActivityInput } from "../handler";

import * as azure from "azure-sb";
import { NotifyMessage } from "../../generated/notifications/NotifyMessage";

import { envConfig } from "../../__mocks__/env-config.mock";
import {
  ActivityResultSuccess,
  createActivity
} from "../../utils/durable/activities";
import { TelemetryClient } from "applicationinsights";
import { NotificationHubConfig } from "../../utils/notificationhubServicePartition";

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

const mockTelemetryClient = ({
  trackEvent: () => {}
} as unknown) as TelemetryClient;

const mockNotificationHubService = {
  send: jest.fn()
};
const mockBuildNHService = jest
  .fn()
  .mockImplementation(
    _ => (mockNotificationHubService as unknown) as azure.NotificationHubService
  );

const activityName = "any";

const handler = createActivity(
  activityName,
  ActivityInput, // FIXME: the editor marks it as type error, but tests compile correctly
  ActivityResultSuccess,
  getActivityBody(mockTelemetryClient, mockBuildNHService)
);

describe("HandleNHNotifyMessageCallActivity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should call notificationhubServicePartion.buildNHService to get the right notificationService to call", async () => {
    mockNotificationHubService.send = jest
      .fn()
      .mockImplementation((_1, _2, _3, cb) => cb());

    const input = ActivityInput.encode({
      message: aNotifyMessage,
      notificationHubConfig: aNHConfig
    });

    expect.assertions(3);

    const res = await handler(contextMock as any, input);
    expect(res.kind).toEqual("SUCCESS");

    expect(mockBuildNHService).toHaveBeenCalledTimes(1);
    expect(mockBuildNHService).toBeCalledWith(aNHConfig);
  });

  it("should trigger a retry if notify fails", async () => {
    mockNotificationHubService.send = jest
      .fn()
      .mockImplementation((_1, _2, _3, cb) => cb(new Error("send error")));

    const input = NHServiceActivityInput.encode({
      message: aNotifyMessage,
      notificationHubConfig: {
        AZURE_NH_ENDPOINT: envConfig.AZURE_NH_ENDPOINT,
        AZURE_NH_HUB_NAME: envConfig.AZURE_NH_HUB_NAME
      }
    });
    expect.assertions(2);
    try {
      await handler(contextMock as any, input);
    } catch (e) {
      expect(mockNotificationHubService.send).toHaveBeenCalledTimes(1);
      expect(e).toBeInstanceOf(Error);
    }
  });
});
