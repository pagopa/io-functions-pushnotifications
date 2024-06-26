import { envConfig } from "../../__mocks__/env-config.mock";

import { checkAzureNotificationHub } from "../healthcheck";

import { pipe } from "fp-ts/lib/function";

import * as TE from "fp-ts/lib/TaskEither";
import { NotificationHubsClient } from "@azure/notification-hubs";

const notificationhubServicePartition = require("../notificationhubServicePartition");

const mockNotificationHubServiceKO = ({
  deleteInstallation: jest.fn((_, callback) =>
    callback(Error("An error occurred"), null)
  )
} as unknown) as NotificationHubsClient;

const mockNotificationHubServiceOK = ({
  deleteInstallation: jest.fn(_ => Promise.resolve({}))
} as unknown) as NotificationHubsClient;
const mockBuildNHClient = jest
  .fn()
  .mockReturnValue(mockNotificationHubServiceOK);

function mockNHFunctions() {
  notificationhubServicePartition["buildNHClient"] = mockBuildNHClient;
}

// -------------
// TESTS
// -------------

describe("healthcheck - notification hub", () => {
  beforeAll(() => mockNHFunctions());

  it("should not throw exception", done => {
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

  it("should throw exception", async () => {
    mockBuildNHClient.mockReturnValueOnce(mockNotificationHubServiceKO);

    expect.assertions(2);

    pipe(
      checkAzureNotificationHub(
        envConfig.AZURE_NH_ENDPOINT,
        envConfig.AZURE_NH_HUB_NAME
      ),
      TE.mapLeft(err => {
        expect(err.length).toBe(1);
        expect(true).toBe(true);
      }),
      TE.map(_ => {
        expect(true).toBeFalsy();
      })
    )();
  });
});
