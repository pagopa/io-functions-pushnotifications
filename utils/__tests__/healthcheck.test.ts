import { BlobService, ErrorOrResult, ServiceResponse } from "azure-storage";

import { envConfig } from "../../__mocks__/env-config.mock";

import {
  checkAzureNotificationHub,
  checkAzureStorageHealth
} from "../healthcheck";

import * as azure from "azure-sb";
import { pipe } from "fp-ts/lib/function";

import * as TE from "fp-ts/lib/TaskEither";

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

    pipe(
      "",
      checkAzureStorageHealth,
      TE.map(_ => {
        expect(true).toBe(true);
        done();
      })
    )();
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

      pipe(
        "",
        checkAzureStorageHealth,
        TE.mapLeft(err => {
          expect(err[0]).toBe(`AzureStorage|error - ${name}`);
          done();
        })
      )();
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

    pipe(
      envConfig,
      checkAzureNotificationHub,
      TE.map(_ => {
        expect(true).toBe(true);
        done();
      })
    )();
  });

  it("should throw exception", async done => {
    notificationhubServicePartition[
      "buildNHService"
    ] = jest.fn().mockReturnValueOnce(mockNotificationHubServiceKO);

    expect.assertions(1);

    pipe(
      envConfig,
      checkAzureNotificationHub,
      TE.mapLeft(_ => {
        expect(true).toBe(true);
        done();
      })
    )();
  });
});
