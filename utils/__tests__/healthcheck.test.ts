import { BlobService, ErrorOrResult, ServiceResponse } from "azure-storage";

import { envConfig } from "../../__mocks__/env-config.mock";

import {
  checkAzureNotificationHub,
  checkAzureStorageHealth
} from "../healthcheck";

import { NonEmptyString } from "italia-ts-commons/lib/strings";
import { IConfig } from "../config";

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
  azure_storage["createBlobService"] = jest.fn(connString => blobServiceOk);
  azure_storage["createFileService"] = jest.fn(connString => blobServiceOk);
  azure_storage["createQueueService"] = jest.fn(connString => blobServiceOk);
  azure_storage["createTableService"] = jest.fn(connString => blobServiceOk);
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
      .run()
      .then(p =>
        p.map(_ => {
          expect(true).toBe(true);
          done();
        })
      );
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
        .run()
        .then(p =>
          p
            .map(_ => {
              expect(true).toBe(false);
              done();
            })
            .mapLeft(err => {
              expect(err[0]).toBe(`AzureStorage|error - ${name}`);
              done();
            })
        );
    }
  );
});

describe("healthcheck - notification hub", () => {
  const mockNotificationHubServiceOK = {
    deleteInstallation: jest.fn((name, callback) => callback(null, null))
  };
  notificationhubServicePartition["buildNHService"] = jest
    .fn()
    .mockReturnValue(
      (mockNotificationHubServiceOK as unknown) as azure.NotificationHubService
    );

  it("should not throw exception", async done => {
    expect.assertions(1);
    checkAzureNotificationHub(({
      AZURE_NH_ENDPOINT: "endpoint" as NonEmptyString,
      AZURE_NH_HUB_NAME: "name" as NonEmptyString,
      AZURE_NOTIFICATION_HUB_PARTITIONS:
        envConfig.AZURE_NOTIFICATION_HUB_PARTITIONS
    } as unknown) as IConfig)
      .run()
      .then(p =>
        p.map(_ => {
          expect(true).toBe(true);
          done();
        })
      );
  });

  it("should throw exception", async done => {
    const mockNotificationHubServiceKO = {
      deleteInstallation: jest.fn((name, callback) => callback(Error(""), null))
    };
    notificationhubServicePartition[
      "buildNHService"
    ] = jest
      .fn()
      .mockReturnValueOnce(
        (mockNotificationHubServiceKO as unknown) as azure.NotificationHubService
      );

    expect.assertions(1);
    checkAzureNotificationHub(({
      AZURE_NH_ENDPOINT: "endpoint" as NonEmptyString,
      AZURE_NH_HUB_NAME: "name" as NonEmptyString,
      AZURE_NOTIFICATION_HUB_PARTITIONS:
        envConfig.AZURE_NOTIFICATION_HUB_PARTITIONS
    } as unknown) as IConfig)
      .run()
      .then(p =>
        p.fold(
          _ => {
            expect(true).toBe(true);
            done();
          },
          _ => {
            expect(true).toBe(false);
            done();
          }
        )
      );
  });
});
