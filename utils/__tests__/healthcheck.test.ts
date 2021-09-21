import { envConfig } from "../../__mocks__/env-config.mock";

import { checkAzureNotificationHub } from "../healthcheck";

import * as azure from "azure-sb";
import { pipe } from "fp-ts/lib/function";

import * as TE from "fp-ts/lib/TaskEither";

const notificationhubServicePartition = require("../notificationhubServicePartition");

const mockNotificationHubServiceKO = ({
  deleteInstallation: jest.fn((_, callback) =>
    callback(Error("An error occurred"), null)
  )
} as unknown) as azure.NotificationHubService;

const mockNotificationHubServiceOK = ({
  deleteInstallation: jest.fn((_, callback) => callback(null, null))
} as unknown) as azure.NotificationHubService;
const mockBuildNHService = jest
  .fn()
  .mockReturnValue(mockNotificationHubServiceOK);

function mockNHFunctions() {
  notificationhubServicePartition["buildNHService"] = mockBuildNHService;
}

// -------------
// TESTS
// -------------

describe("healthcheck - notification hub", () => {
  beforeAll(() => mockNHFunctions());

  it("should not throw exception", async done => {
    expect.assertions(1);

    pipe(
      checkAzureNotificationHub(
        envConfig.AZURE_NH_ENDPOINT,
        envConfig.AZURE_NH_HUB_NAME
      ),
      TE.map(_ => {
        expect(true).toBe(true);
        done();
      })
    )();
  });

  it("should throw exception", async done => {
    mockBuildNHService.mockReturnValueOnce(mockNotificationHubServiceKO);

    expect.assertions(2);

    pipe(
      checkAzureNotificationHub(
        envConfig.AZURE_NH_ENDPOINT,
        envConfig.AZURE_NH_HUB_NAME
      ),
      TE.mapLeft(err => {
        expect(err.length).toBe(1);
        expect(true).toBe(true);
        done();
      }),
      TE.map(_ => {
        expect(true).toBeFalsy();
        done();
      })
    )();
  });
});
