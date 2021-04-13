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
        partitionRegex: "^[c-f]" as NonEmptyString,
        name: "io-notification-hub-mock" as NonEmptyString,
        namespace: "io-p-ntfns-sandbox" as NonEmptyString,
        sharedAccessKey: "anAccessKey" as NonEmptyString
      })
    });

    expect(isRight(configDecodedWrong)).toBeFalsy();
  });

  it("should throw error with wrong array of NH partitions - at least one regex not starting from first character", () => {
    var configDecodedWrong = IConfig.decode({
      ...aConfig,
      AZURE_NOTIFICATION_HUB_PARTITIONS: JSON.stringify([
        {
          partitionRegex: "^[0-3]" as NonEmptyString,
          name: "io-notification-hub-mock" as NonEmptyString,
          namespace: "io-p-ntfns-sandbox" as NonEmptyString,
          sharedAccessKey: "anAccessKey" as NonEmptyString
        },
        {
          partitionRegex: "[4-7]" as NonEmptyString,
          name: "io-notification-hub-mock" as NonEmptyString,
          namespace: "io-p-ntfns-sandbox" as NonEmptyString,
          sharedAccessKey: "anAccessKey" as NonEmptyString
        },
        {
          partitionRegex: "^[8-b]" as NonEmptyString,
          name: "io-notification-hub-mock" as NonEmptyString,
          namespace: "io-p-ntfns-sandbox" as NonEmptyString,
          sharedAccessKey: "anAccessKey" as NonEmptyString
        },
        {
          partitionRegex: "^[c-f]" as NonEmptyString,
          name: "io-notification-hub-mock" as NonEmptyString,
          namespace: "io-p-ntfns-sandbox" as NonEmptyString,
          sharedAccessKey: "anAccessKey" as NonEmptyString
        }
      ])
    });

    expect(isRight(configDecodedWrong)).toBeFalsy();
  });

  it("should throw error with wrong array of NH partitions - overlapping regex", () => {
    var configDecodedWrong = IConfig.decode({
      ...aConfig,
      AZURE_NOTIFICATION_HUB_PARTITIONS: JSON.stringify([
        {
          partitionRegex: "^[0-8]" as NonEmptyString,
          name: "io-notification-hub-mock" as NonEmptyString,
          namespace: "io-p-ntfns-sandbox" as NonEmptyString,
          sharedAccessKey: "anAccessKey" as NonEmptyString
        },
        {
          partitionRegex: "^[4-7]" as NonEmptyString,
          name: "io-notification-hub-mock" as NonEmptyString,
          namespace: "io-p-ntfns-sandbox" as NonEmptyString,
          sharedAccessKey: "anAccessKey" as NonEmptyString
        },
        {
          partitionRegex: "^[8-b]" as NonEmptyString,
          name: "io-notification-hub-mock" as NonEmptyString,
          namespace: "io-p-ntfns-sandbox" as NonEmptyString,
          sharedAccessKey: "anAccessKey" as NonEmptyString
        },
        {
          partitionRegex: "^[c-f]" as NonEmptyString,
          name: "io-notification-hub-mock" as NonEmptyString,
          namespace: "io-p-ntfns-sandbox" as NonEmptyString,
          sharedAccessKey: "anAccessKey" as NonEmptyString
        }
      ])
    });

    expect(isRight(configDecodedWrong)).toBeFalsy();
  });
});
