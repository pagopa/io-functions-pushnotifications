import * as E from "fp-ts/lib/Either";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import {
  getNHLegacyConfig,
  getNotificationHubPartitionConfig,
  testShaForPartitionRegex
} from "../notificationhubServicePartition";
import { NHClientError } from "../notification";

import { envConfig } from "../../__mocks__/env-config.mock";
import { InstallationId } from "../../generated/notifications/InstallationId";

const aFiscalCodeHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" as NonEmptyString;

describe("NotificationHubServicepartition", () => {
  it("should return always NH0 Configuration", () => {
    const nhConfig = getNHLegacyConfig(envConfig);

    expect(nhConfig.AZURE_NH_ENDPOINT).toBe(envConfig.AZURE_NH_ENDPOINT);
    expect(nhConfig.AZURE_NH_HUB_NAME).toBe(envConfig.AZURE_NH_HUB_NAME);
  });
});

describe("NHClientError", () => {
  it("should decode a 404 as right", () => {
    expect(
      E.isRight(NHClientError.decode({ statusCode: 404, message: "foo" }))
    ).toBe(true);
  });

  it("should decode a 401 as left", () => {
    expect(
      E.isLeft(NHClientError.decode({ statusCode: 401, message: "foo" }))
    ).toBe(true);
  });
});

describe("Partition Regex", () => {
  it("should return true if sha is in partition 0 [0-3]", () => {
    const aValidInstallationId = "03b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" as InstallationId;
    const invalidInstallationId = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b891" as InstallationId;

    const partition1RegexString = "^[0-3]";

    expect(
      testShaForPartitionRegex(partition1RegexString, aValidInstallationId)
    ).toBe(true);

    expect(
      testShaForPartitionRegex(partition1RegexString, invalidInstallationId)
    ).toBe(false);

    const partition1Regex = RegExp("^[0-3]");
    expect(
      testShaForPartitionRegex(partition1Regex, aValidInstallationId)
    ).toBe(true);

    expect(
      testShaForPartitionRegex(partition1Regex, invalidInstallationId)
    ).toBe(false);
  });

  it("should return true if sha is in partition 1 [4-7]", () => {
    const aValidInstallationId = "63b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" as InstallationId;
    const invalidInstallationId = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b891" as InstallationId;

    const partition1Regex = "^[4-7]";

    expect(
      testShaForPartitionRegex(partition1Regex, aValidInstallationId)
    ).toBe(true);

    expect(
      testShaForPartitionRegex(partition1Regex, invalidInstallationId)
    ).toBe(false);
  });

  it("should return true if sha is in partition 1 [8-b]", () => {
    const aValidInstallationId = "93b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" as InstallationId;
    const invalidInstallationId = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b891" as InstallationId;

    const partition1Regex = "^[8-b]";

    expect(
      testShaForPartitionRegex(partition1Regex, aValidInstallationId)
    ).toBe(true);

    expect(
      testShaForPartitionRegex(partition1Regex, invalidInstallationId)
    ).toBe(false);
  });

  it("should return true if sha is in partition 1 [c-f]", () => {
    const aValidInstallationId = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" as InstallationId;
    const invalidInstallationId = "03b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b891" as InstallationId;

    const partition1Regex = "^[c-f]";

    expect(
      testShaForPartitionRegex(partition1Regex, aValidInstallationId)
    ).toBe(true);

    expect(
      testShaForPartitionRegex(partition1Regex, invalidInstallationId)
    ).toBe(false);
  });

  it("should return right Notification Hub partition", () => {
    const NH = getNotificationHubPartitionConfig(envConfig)(aFiscalCodeHash);

    expect(NH.AZURE_NH_HUB_NAME).toBe(
      envConfig.AZURE_NOTIFICATION_HUB_PARTITIONS[3].name
    );
  });

  it("should throw exception if no Notification Hub partition has been found", () => {
    const fakeInstallationId = "hhhhhh" as InstallationId;

    expect(() => {
      const NH = getNotificationHubPartitionConfig(envConfig)(
        fakeInstallationId
      );
    }).toThrowError(
      `Unable to find Notification Hub partition for ${fakeInstallationId}`
    );
  });
});
