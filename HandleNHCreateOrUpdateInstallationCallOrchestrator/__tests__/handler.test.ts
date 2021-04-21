// tslint:disable:no-any

import { NonEmptyString } from "italia-ts-commons/lib/strings";
import { context as contextMockBase } from "../../__mocks__/durable-functions";
import { PlatformEnum } from "../../generated/backend/Platform";
import {
  CreateOrUpdateInstallationMessage,
  KindEnum as CreateOrUpdateKind
} from "../../generated/notifications/CreateOrUpdateInstallationMessage";

import { success } from "../../utils/durable/activities";
import { consumeGenerator } from "../../utils/durable/utils";
import {
  getHandler,
  NhCreateOrUpdateInstallationOrchestratorCallInput
} from "../handler";

import { NotificationHubConfig } from "../../utils/notificationhubServicePartition";
import { readableReport } from "italia-ts-commons/lib/reporters";
import { IOrchestrationFunctionContext } from "durable-functions/lib/src/iorchestrationfunctioncontext";
import {
  CallableActivity,
  failureActivity,
  OrchestratorActivityFailure,
  OrchestratorFailure,
  OrchestratorInvalidInputFailure,
  OrchestratorSuccess,
  OrchestratorUnhandledFailure
} from "../../utils/durable/orchestrators";
import { ActivityInput as CreateOrUpdateActivityInput } from "../../HandleNHCreateOrUpdateInstallationCallActivity";

import { getMockIsUserATestUserActivity } from "../../__mocks__/activities-mocks";
import { TelemetryClient } from "applicationinsights";

import { defaultClient } from "../../__mocks__/applicationinsights";

const aFiscalCodeHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" as NonEmptyString;
const aPushChannel =
  "fLKP3EATnBI:APA91bEy4go681jeSEpLkNqhtIrdPnEKu6Dfi-STtUiEnQn8RwMfBiPGYaqdWrmzJyXIh5Yms4017MYRS9O1LGPZwA4sOLCNIoKl4Fwg7cSeOkliAAtlQ0rVg71Kr5QmQiLlDJyxcq3p";

const aCreateOrUpdateInstallationMessage = CreateOrUpdateInstallationMessage.decode(
  {
    installationId: aFiscalCodeHash,
    kind: CreateOrUpdateKind.CreateOrUpdateInstallation,
    platform: PlatformEnum.apns,
    pushChannel: aPushChannel,
    tags: [aFiscalCodeHash]
  }
).getOrElseL(err => {
  throw new Error(
    `Cannot decode aCreateOrUpdateInstallationMessage: ${readableReport(err)}`
  );
});

const anOrchestratorInput = NhCreateOrUpdateInstallationOrchestratorCallInput.encode(
  {
    message: aCreateOrUpdateInstallationMessage
  }
);

const aNotificationHubConfig = NotificationHubConfig.decode({
  AZURE_NH_ENDPOINT: "foo",
  AZURE_NH_HUB_NAME: "bar"
}).getOrElseL(err => {
  throw new Error(
    `Cannot decode aNotificationHubConfig: ${readableReport(err)}`
  );
});

type CallableCreateOrUpdateActivity = CallableActivity<
  CreateOrUpdateActivityInput // FIXME: the editor marks it as type error, but tests compile correctly
>;
const mockCreateOrUpdateActivity = jest.fn<
  ReturnType<CallableCreateOrUpdateActivity>,
  Parameters<CallableCreateOrUpdateActivity>
>(function*() {
  return { kind: "SUCCESS" };
});

const mockGetInput = jest.fn<unknown, []>(() => anOrchestratorInput);
const contextMock = ({
  ...contextMockBase,
  df: {
    callActivityWithRetry: jest.fn().mockReturnValueOnce(success()),
    getInput: mockGetInput
  }
} as unknown) as IOrchestrationFunctionContext;

defaultClient.trackEvent = jest.fn().mockImplementation(_ => {});

describe("HandleNHCreateOrUpdateInstallationCallOrchestrator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it("should start the activities with the right inputs", async () => {
    const mockIsUserATestUserActivity = getMockIsUserATestUserActivity(true);

    const orchestratorHandler = getHandler({
      createOrUpdateActivity: mockCreateOrUpdateActivity,
      isUserInActiveTestSubsetActivity: mockIsUserATestUserActivity,
      notificationHubConfig: aNotificationHubConfig,
      telemetryClient: defaultClient,
      featureFlag: "none"
    })(contextMock);

    const result = consumeGenerator(orchestratorHandler);

    OrchestratorSuccess.decode(result).fold(
      err => fail(`Cannot decode test result, err: ${readableReport(err)}`),
      _ => {
        expect(mockCreateOrUpdateActivity).toBeCalledWith(
          expect.any(Object),
          expect.objectContaining({
            installationId: aCreateOrUpdateInstallationMessage.installationId,
            platform: aCreateOrUpdateInstallationMessage.platform,
            tags: aCreateOrUpdateInstallationMessage.tags,
            pushChannel: aCreateOrUpdateInstallationMessage.pushChannel,
            notificationHubConfig: aNotificationHubConfig
          })
        );
      }
    );
  });

  it("should not start activity with wrong inputs", async () => {
    const input = {
      message: "aMessage"
    };
    mockGetInput.mockImplementationOnce(() => input);

    const mockIsUserATestUserActivity = getMockIsUserATestUserActivity(true);

    const orchestratorHandler = getHandler({
      createOrUpdateActivity: mockCreateOrUpdateActivity,
      isUserInActiveTestSubsetActivity: mockIsUserATestUserActivity,
      notificationHubConfig: aNotificationHubConfig,
      telemetryClient: defaultClient,
      featureFlag: "none"
    })(contextMock);

    const result = consumeGenerator(orchestratorHandler);

    expect(mockCreateOrUpdateActivity).not.toBeCalled();
    OrchestratorFailure.decode(result).fold(
      err => fail(`Cannot decode test result, err: ${readableReport(err)}`),
      decoded => {
        expect(OrchestratorInvalidInputFailure.is(decoded)).toBe(true);
        expect(decoded).toEqual(
          expect.objectContaining({
            input
          })
        );
      }
    );
  });

  it("should fail if CreateOrUpdateActivity fails with unexpected throw", async () => {
    mockCreateOrUpdateActivity.mockImplementationOnce(() => {
      throw new Error("any exception");
    });

    const mockIsUserATestUserActivity = getMockIsUserATestUserActivity(true);

    const orchestratorHandler = getHandler({
      createOrUpdateActivity: mockCreateOrUpdateActivity,
      isUserInActiveTestSubsetActivity: mockIsUserATestUserActivity,
      notificationHubConfig: aNotificationHubConfig,
      telemetryClient: defaultClient,
      featureFlag: "none"
    })(contextMock);

    const result = consumeGenerator(orchestratorHandler);

    OrchestratorFailure.decode(result).fold(
      err => fail(`Cannot decode test result, err: ${readableReport(err)}`),
      decoded => {
        expect(OrchestratorUnhandledFailure.is(decoded)).toBe(true);
      }
    );
  });

  it("should fail if CreateOrUpdateActivity fails ", async () => {
    mockCreateOrUpdateActivity.mockImplementationOnce(() => {
      throw failureActivity("any activity name", "any reason");
    });

    const mockIsUserATestUserActivity = getMockIsUserATestUserActivity(true);

    const orchestratorHandler = getHandler({
      createOrUpdateActivity: mockCreateOrUpdateActivity,
      isUserInActiveTestSubsetActivity: mockIsUserATestUserActivity,
      notificationHubConfig: aNotificationHubConfig,
      telemetryClient: defaultClient,
      featureFlag: "none"
    })(contextMock);

    const result = consumeGenerator(orchestratorHandler);

    OrchestratorFailure.decode(result).fold(
      err => fail(`Cannot decode test result, err: ${readableReport(err)}`),
      decoded => {
        expect(OrchestratorActivityFailure.is(decoded)).toBe(true);
      }
    );
  });
});
