/* eslint-disable @typescript-eslint/no-explicit-any */
import * as df from "durable-functions";
import { DurableOrchestrationClient } from "durable-functions/lib/src/durableorchestrationclient";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { context } from "../../__mocks__/durable-functions";

import { CreateOrUpdateInstallationMessage } from "../../generated/notifications/CreateOrUpdateInstallationMessage";
import { DeleteInstallationMessage } from "../../generated/notifications/DeleteInstallationMessage";
import { NotifyMessage } from "../../generated/notifications/NotifyMessage";
import { PlatformEnum } from "../../generated/notifications/Platform";

import { success } from "../../utils/durable/activities";
import { getHandler } from "../handler";
import { NhNotifyMessageRequest } from "../../utils/types";

const dfClient = ({
  startNew: jest.fn().mockImplementation((_, __, ___) => success())
} as any) as DurableOrchestrationClient;

jest.spyOn(df, "getClient").mockReturnValue(dfClient);

const aFiscalCodeHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" as NonEmptyString;
const aPushChannel =
  "fLKP3EATnBI:APA91bEy4go681jeSEpLkNqhtIrdPnEKu6Dfi-STtUiEnQn8RwMfBiPGYaqdWrmzJyXIh5Yms4017MYRS9O1LGPZwA4sOLCNIoKl4Fwg7cSeOkliAAtlQ0rVg71Kr5QmQiLlDJyxcq3p";

const aDeleteInStalltionMessage: DeleteInstallationMessage = {
  installationId: aFiscalCodeHash,
  kind: "DeleteInstallation" as any
};

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

const betaTestUser: ReadonlyArray<{ readonly RowKey: string }> = [
  { RowKey: aNotifyMessage.installationId }
];
const dummyContextWithBeta = {
  ...context,
  bindings: {
    betaTestUser: betaTestUser
  }
};

describe("HandleNHNotificationCall", () => {
  it("should call Delete Orchestrator when message is DeleteInstallation", async () => {
    await getHandler(".*" as NonEmptyString, "none")(
      dummyContextWithBeta,
      aDeleteInStalltionMessage
    );

    expect(dfClient.startNew).toHaveBeenCalledWith(
      "HandleNHDeleteInstallationCallOrchestrator",
      undefined,
      {
        message: aDeleteInStalltionMessage
      }
    );
  });

  it("should call CreateOrUpdate Orchestrator when message is CreateorUpdateInstallation", async () => {
    await getHandler(".*" as NonEmptyString, "none")(
      dummyContextWithBeta,
      aCreateOrUpdateInstallationMessage
    );

    expect(dfClient.startNew).toHaveBeenCalledWith(
      "HandleNHCreateOrUpdateInstallationCallOrchestrator",
      undefined,
      {
        message: aCreateOrUpdateInstallationMessage
      }
    );
  });

  it("should call Notify Orchestrator when message is NotifyMessage", async () => {
    await getHandler(".*" as NonEmptyString, "none")(
      dummyContextWithBeta,
      aNotifyMessage
    );

    expect(dfClient.startNew).toHaveBeenCalledWith(
      "HandleNHNotifyMessageCallOrchestrator",
      undefined,
      {
        message: aNotifyMessage
      }
    );
  });

  it("should push to Notify Queue when message is NotifyMessage and FF i set to beta", async () => {
    const bindedContext = {
      ...dummyContextWithBeta,
      bindings: {
        ...dummyContextWithBeta.bindings,
        notifyMessages: null
      }
    };
    await getHandler(".*" as NonEmptyString, "beta")(
      bindedContext as any,
      aNotifyMessage
    );

    expect(bindedContext.bindings.notifyMessages).toEqual([
      Buffer.from(
        JSON.stringify(
          NhNotifyMessageRequest.encode({
            message: aNotifyMessage,
            target: "current"
          })
        )
      ).toString("base64"),
      Buffer.from(
        JSON.stringify(
          NhNotifyMessageRequest.encode({
            message: aNotifyMessage,
            target: "legacy"
          })
        )
      ).toString("base64")
    ]);
  });

  it("should not call any Orchestrator when message kind is not correct", async () => {
    const aWrongMessage = {
      installationId: aFiscalCodeHash,
      kind: "WrongMessage" as any
    };

    expect.assertions(1);
    try {
      await getHandler(".*" as NonEmptyString, "none")(
        dummyContextWithBeta,
        aWrongMessage
      );
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }
  });
});
