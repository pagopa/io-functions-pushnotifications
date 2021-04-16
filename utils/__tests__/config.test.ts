import { isRight } from "fp-ts/lib/Either";
import { IConfig } from "../config";
import { envConfig } from "../../__mocks__/env-config.mock";

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
});
