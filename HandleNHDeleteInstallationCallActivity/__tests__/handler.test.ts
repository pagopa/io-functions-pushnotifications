// tslint:disable:no-any

import { NonEmptyString } from "italia-ts-commons/lib/strings";
import { context as contextMock } from "../../__mocks__/durable-functions";
import { getCallNHDeleteInstallationActivityHandler } from "../handler";
import { ActivityInput as NHServiceActivityInput } from "../handler";

import * as azure from "azure-sb";
import { DeleteInstallationMessage } from "../../generated/notifications/DeleteInstallationMessage";

import * as notificationhubServicePartition from "../../utils/notificationhubServicePartition";
import { envConfig } from "../../__mocks__/env-config.mock";
import { NotificationHubConfig } from "../../utils/notificationhubServicePartition";

const deleteInstallationSpy = jest
  .spyOn(azure.NotificationHubService.prototype, "deleteInstallation")
  .mockImplementation((_, cb) => cb(new Error("deleteInstallation error")));

const aFiscalCodeHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" as NonEmptyString;

const aDeleteInStalltionMessage: DeleteInstallationMessage = {
  installationId: aFiscalCodeHash,
  kind: "DeleteInstallation" as any
};

const aNHConfig = {
  AZURE_NH_ENDPOINT: envConfig.AZURE_NH_ENDPOINT,
  AZURE_NH_HUB_NAME: envConfig.AZURE_NH_HUB_NAME
} as NotificationHubConfig;

describe("HandleNHDeleteInstallationCallActivity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it("should NOT trigger a retry if deleteInstallation fails", async () => {
    const handler = getCallNHDeleteInstallationActivityHandler();
    const input = NHServiceActivityInput.encode({
      message: aDeleteInStalltionMessage,
      notificationHubConfig: aNHConfig
    });
    const res = await handler(contextMock as any, input);
    expect(deleteInstallationSpy).toHaveBeenCalledTimes(1);
    expect(res.kind).toEqual("FAILURE");
  });
});
