import { isRight } from "fp-ts/lib/Either";
import { IConfig } from "../config";
import { envConfig } from "../../__mocks__/env.mock";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { readableReport } from "@pagopa/ts-commons/lib/reporters";

const aConfig = { ...envConfig, isProduction: false };

beforeEach(() => {
  jest.clearAllMocks();
});

describe("IConfig", () => {
  it.each`
    ff
    ${"all"}
    ${"none"}
    ${"beta"}
    ${"canary"}
  `("should deserialize config with $ff user subset", ({ ff }) => {
    var decoded = IConfig.decode({
      ...aConfig,
      NH_PARTITION_FEATURE_FLAG: ff
    }).getOrElseL(e => fail(`Cannot decode config, ${readableReport(e)}`));

    expect(typeof decoded).toBe("object");
  });

  it("should throw error with wrong FF inputs", () => {
    var decoded = IConfig.decode({
      ...aConfig,
      NH_PARTITION_FEATURE_FLAG: "wrong"
    });

    expect(isRight(decoded)).toBe(false);
  });

  it("should not override computed value for AZURE_NOTIFICATION_HUB_PARTITIONS", () => {
    var config = IConfig.decode({
      ...aConfig,
      AZURE_NOTIFICATION_HUB_PARTITIONS: "any value"
    }).getOrElseL(e => fail(`Cannot decode config, ${readableReport(e)}`));

    expect(config.AZURE_NOTIFICATION_HUB_PARTITIONS).toEqual(expect.any(Array));
    expect(config.AZURE_NOTIFICATION_HUB_PARTITIONS).not.toBe("any value");
  });
});
