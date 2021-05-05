import { BlobService, ErrorOrResult, ServiceResponse } from "azure-storage";

import { envConfig } from "../../__mocks__/env-config.mock";

import {
  checkAzureNotificationHub,
  checkAzureStorageHealth
} from "../healthcheck";

import * as azure from "azure-sb";

const azure_storage = require("azure-storage");
const notificationhubServicePartition = require("../notificationhubServicePartition");

const blobServiceOk: BlobService = ({
  getServiceProperties: jest
    .fn()
    .mockImplementation((callback: ErrorOrResult<any>) =>
      callback(
        (null as unknown) as Error,
        "ok",
        (null as unknown) as ServiceResponse
      )
    )
} as unknown) as BlobService;

const getBlobServiceKO = (name: string) =>
  (({
    getServiceProperties: jest
      .fn()
      .mockImplementation((callback: ErrorOrResult<any>) =>
        callback(
          Error(`error - ${name}`),
          null,
          (null as unknown) as ServiceResponse
        )
      )
  } as unknown) as BlobService);

function mockAzureStorageFunctions() {
  azure_storage["createBlobService"] = jest.fn(_ => blobServiceOk);
  azure_storage["createFileService"] = jest.fn(_ => blobServiceOk);
  azure_storage["createQueueService"] = jest.fn(_ => blobServiceOk);
  azure_storage["createTableService"] = jest.fn(_ => blobServiceOk);
}

describe("healthcheck - storage account", () => {
  beforeAll(() => {
    jest.clearAllMocks();
  });
  beforeEach(() => {
    mockAzureStorageFunctions();
  });

  it("should not throw exception", async done => {
    expect.assertions(1);
    checkAzureStorageHealth("")
      .map(_ => {
        expect(true).toBe(true);
        done();
      })
      .run();
  });

  const testcases: {
    name: string;
  }[] = [
    {
      name: "createBlobService"
    },
    {
      name: "createFileService"
    },
    {
      name: "createQueueService"
    },
    {
      name: "createTableService"
    }
  ];
  test.each(testcases)(
    "should throw exception %s",
    async ({ name }, done: any) => {
      const blobServiceKO = getBlobServiceKO(name);

      azure_storage[name] = jest.fn(connString => blobServiceKO);

      expect.assertions(1);
      checkAzureStorageHealth("")
        .mapLeft(err => {
          expect(err[0]).toBe(`AzureStorage|error - ${name}`);
          done();
        })
        .run();
    }
  );
});

describe("healthcheck - notification hub", () => {
  const mockNotificationHubServiceOK = ({
    deleteInstallation: jest.fn((_, callback) => callback(null, null))
  } as unknown) as azure.NotificationHubService;
  const mockNotificationHubServiceKO = ({
    deleteInstallation: jest.fn((_, callback) => callback(Error(""), null))
  } as unknown) as azure.NotificationHubService;

  notificationhubServicePartition["buildNHService"] = jest
    .fn()
    .mockReturnValue(mockNotificationHubServiceOK);

  it("should not throw exception", async done => {
    expect.assertions(1);
    checkAzureNotificationHub(envConfig)
      .map(_ => {
        expect(true).toBe(true);
        done();
      })
      .run();
  });

  it("should throw exception", async done => {
    notificationhubServicePartition[
      "buildNHService"
    ] = jest.fn().mockReturnValueOnce(mockNotificationHubServiceKO);

    expect.assertions(1);
    checkAzureNotificationHub(envConfig)
      .mapLeft(_ => {
        expect(true).toBe(true);
        done();
      })
      .run();
  });
});
