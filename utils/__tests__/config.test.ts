import { isLeft, isRight } from "fp-ts/lib/Either";
import { IConfig } from "../config";
import * as t from "io-ts";
import { IntegerFromString } from "italia-ts-commons/lib/numbers";
import { NonEmptyString } from "italia-ts-commons/lib/strings";

const aConfig = {
  NH_PARTITION_FEATURE_FLAG: "all",

  RETRY_ATTEMPT_NUMBER: "2",
  AZURE_NH_ENDPOINT:
    "sb://host.docker.internal:30000;SharedAccessKeyName=DefaultFullSharedAccessSignature;SharedAccessKey=foobar",
  AZURE_NH_HUB_NAME: "io-notification-hub-mock",
  AzureWebJobsStorage: "connString",
  NOTIFICATIONS_STORAGE_CONNECTION_STRING: "connString",

  APPINSIGHTS_INSTRUMENTATIONKEY: "IDoNotKnow",
  // the internal function runtime has MaxTelemetryItem per second set to 20 by default
  // @see https://github.com/Azure/azure-functions-host/blob/master/src/WebJobs.Script/Config/ApplicationInsightsLoggerOptionsSetup.cs#L29
  APPINSIGHTS_SAMPLING_PERCENTAGE: "20",

  isProduction: false
};

describe("IConfig", () => {
  it("should deserialize right FF input", () => {
    var configDecoded_All = IConfig.decode(aConfig);

    expect(isRight(configDecoded_All)).toBeTruthy();

    var configDecoded_None = IConfig.decode({
      ...aConfig,
      NH_PARTITION_FEATURE_FLAG: "none"
    });

    expect(isRight(configDecoded_None)).toBeTruthy();

    var configDecoded_Beta = IConfig.decode({
      ...aConfig,
      NH_PARTITION_FEATURE_FLAG: "beta"
    });

    expect(isRight(configDecoded_Beta)).toBeTruthy();

    var configDecoded_Canary = IConfig.decode({
      ...aConfig,
      NH_PARTITION_FEATURE_FLAG: "canary"
    });

    expect(isRight(configDecoded_Canary)).toBeTruthy();
  });

  it("should throw error with wrong FF inputs", () => {
    var configDecoded_Wrong = IConfig.decode({
      ...aConfig,
      NH_PARTITION_FEATURE_FLAG: "wrong"
    });

    expect(isRight(configDecoded_Wrong)).toBeFalsy();
  });
});
