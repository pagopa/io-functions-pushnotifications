import { isRight } from "fp-ts/lib/Either";
import { IConfig } from "../config";
import { envConfig } from "../../__mocks__/env-config.mock";
import { NonEmptyString } from "italia-ts-commons/lib/strings";

const aConfig = envConfig;

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

  it("should throw error with wrong array of NH partitions - wrong object", () => {
    var configDecodedWrong = IConfig.decode({
      ...aConfig,
      AZURE_NOTIFICATION_HUB_PARTITIONS:
        '[{ "partitionRegex": "^[0-3]", "name": "name", }]'
    });

    expect(isRight(configDecodedWrong)).toBeFalsy();
  });

  it("should throw error with wrong array of NH partitions - not an array", () => {
    var configDecodedWrong = IConfig.decode({
      ...aConfig,
      AZURE_NOTIFICATION_HUB_PARTITIONS: JSON.stringify({
        partitionRegex: "",
        envVariablePrefix: ""
      })
    });

    expect(isRight(configDecodedWrong)).toBeFalsy();
  });

  it("should throw error with wrong array of NH partitions - at least one regex not starting from first character", () => {
    var configDecodedWrong = IConfig.decode({
      ...aConfig,
      AZURE_NOTIFICATION_HUB_PARTITIONS: JSON.stringify([
        { partitionRegex: "^[0-3]", envVariablePrefix: "AZURE_NH_PARTITION_1" },
        { partitionRegex: "[4-7]", envVariablePrefix: "AZURE_NH_PARTITION_2" },
        { partitionRegex: "^[8-b]", envVariablePrefix: "AZURE_NH_PARTITION_3" },
        { partitionRegex: "^[c-f]", envVariablePrefix: "AZURE_NH_PARTITION_4" }
      ])
    });

    expect(isRight(configDecodedWrong)).toBeFalsy();
  });

  it("should throw error with wrong array of NH partitions - overlapping regex", () => {
    var configDecodedWrong = IConfig.decode({
      ...aConfig,
      AZURE_NOTIFICATION_HUB_PARTITIONS: JSON.stringify([
        { partitionRegex: "^[0-4]", envVariablePrefix: "AZURE_NH_PARTITION_1" },
        { partitionRegex: "^[4-7]", envVariablePrefix: "AZURE_NH_PARTITION_2" },
        { partitionRegex: "^[8-b]", envVariablePrefix: "AZURE_NH_PARTITION_3" },
        { partitionRegex: "^[c-f]", envVariablePrefix: "AZURE_NH_PARTITION_4" }
      ])
    });

    expect(isRight(configDecodedWrong)).toBeFalsy();
  });
});
