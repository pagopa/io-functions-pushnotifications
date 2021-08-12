import { BlobService, ErrorOrResult, ServiceResponse } from "azure-storage";

import { envConfig } from "../../__mocks__/env-config.mock";

import * as config from "../config";

import {
  checkApplicationHealth,
  checkAzureNotificationHub,
  checkAzureStorageHealth
} from "../healthcheck";

import * as azure from "azure-sb";
import { pipe } from "fp-ts/lib/function";

import * as TE from "fp-ts/lib/TaskEither";
import { right } from "fp-ts/lib/Either";

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

const azureStorageMocks = {
  createBlobService: jest.fn(_ => blobServiceOk),
  createFileService: jest.fn(_ => blobServiceOk),
  createQueueService: jest.fn(_ => blobServiceOk),
  createTableService: jest.fn(_ => blobServiceOk)
};

function mockAzureStorageFunctions() {
  azure_storage["createBlobService"] = azureStorageMocks["createBlobService"];
  azure_storage["createFileService"] = azureStorageMocks["createFileService"];
  azure_storage["createQueueService"] = azureStorageMocks["createQueueService"];
  azure_storage["createTableService"] = azureStorageMocks["createTableService"];
}

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

describe("healthcheck - storage account", () => {
  beforeAll(() => {
    jest.clearAllMocks();
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
    name: keyof typeof azureStorageMocks;
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
      azureStorageMocks[name].mockReturnValueOnce(blobServiceKO);

      expect.assertions(2);

      pipe(
        "",
        checkAzureStorageHealth,
        TE.mapLeft(err => {
          expect(err.length).toBe(1);
          expect(err[0]).toBe(`AzureStorage|error - ${name}`);
          done();
        }),
        TE.map(_ => {
          expect(true).toBeFalsy();
          done();
        })
      )();
    }
  );
});

describe("healthcheck - notification hub", () => {
  beforeAll(() => mockNHFunctions());

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
    mockBuildNHService.mockReturnValueOnce(mockNotificationHubServiceKO);

    expect.assertions(2);

    pipe(
      envConfig,
      checkAzureNotificationHub,
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

describe("checkApplicationHealth - multiple errors", () => {
  beforeAll(() => {
    jest.clearAllMocks();
    jest.spyOn(config, "getConfig").mockReturnValue(right(envConfig));
    mockAzureStorageFunctions();
    mockNHFunctions();
  });

  it("should return true if no error raises", async done => {
    expect.assertions(1);

    pipe(
      checkApplicationHealth(),
      TE.mapLeft(err => {
        expect(true).toBeFalsy();
        done();
      }),
      TE.map(_ => {
        expect(true).toBeTruthy();
        done();
      })
    )();
  });

  it("should return an error", async done => {
    const blobServiceKO = getBlobServiceKO("createBlobService");
    azureStorageMocks["createBlobService"].mockReturnValueOnce(blobServiceKO);

    expect.assertions(2);

    pipe(
      checkApplicationHealth(),
      TE.mapLeft(err => {
        expect(err.length).toBe(1);
        expect(err[0]).toBe(`AzureStorage|error - createBlobService`);
        done();
      }),
      TE.map(_ => {
        expect(true).toBeFalsy();
        done();
      })
    )();
  });

  it("should return multiple errors from different checks", async done => {
    const blobServiceKO = getBlobServiceKO("createBlobService");
    const queueServiceKO = getBlobServiceKO("createQueueService");
    azureStorageMocks["createBlobService"].mockReturnValueOnce(blobServiceKO);
    azureStorageMocks["createQueueService"].mockReturnValueOnce(queueServiceKO);

    mockBuildNHService.mockReturnValueOnce(mockNotificationHubServiceKO);

    expect.assertions(4);

    pipe(
      checkApplicationHealth(),
      TE.mapLeft(err => {
        expect(err.length).toBe(3);
        expect(err[0]).toBe(`AzureStorage|error - createBlobService`);
        expect(err[1]).toBe(`AzureStorage|error - createQueueService`);
        expect(err[2]).toBe(`AzureNotificationHub|An error occurred`);
        done();
      }),
      TE.map(_ => {
        expect(true).toBeFalsy();
        done();
      })
    )();
  });
});
