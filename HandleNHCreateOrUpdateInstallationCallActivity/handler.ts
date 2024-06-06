import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";
import * as t from "io-ts";
import {
  AppleInstallation,
  createAppleInstallation,
  createFcmV1Installation,
  FcmV1Installation,
  NotificationHubsClient,
  NotificationHubsResponse
} from "@azure/notification-hubs";
import { toString } from "../utils/conversions";

import { InstallationId } from "../generated/notifications/InstallationId";
import { Platform } from "../generated/notifications/Platform";

import {
  ActivityBody,
  ActivityResultSuccess,
  retryActivity
} from "../utils/durable/activities";
import {
  getInstallationFromInstallationId,
  getPlatformFromInstallation
} from "../utils/notification";
import { NotificationHubConfig } from "../utils/notificationhubServicePartition";

export type ActivityInput = t.TypeOf<typeof ActivityInput>;
export const ActivityInput = t.interface({
  installationId: InstallationId,
  notificationHubConfig: NotificationHubConfig,
  platform: Platform,
  pushChannel: t.string,
  tags: t.readonlyArray(t.string, "array of string")
});

const createInstallation = (
  installation: AppleInstallation | FcmV1Installation
): TE.TaskEither<Error, AppleInstallation | FcmV1Installation> =>
  pipe(
    installation,
    getPlatformFromInstallation,
    TE.map(platform =>
      platform === "fcmv1"
        ? createFcmV1Installation({
            installationId: installation.installationId,
            pushChannel: installation.pushChannel,
            tags: installation.tags
          })
        : createAppleInstallation({
            installationId: installation.installationId,
            pushChannel: installation.pushChannel,
            tags: installation.tags
          })
    )
  );

const createOrUpdateInstallation = (nhService: NotificationHubsClient) => (
  installation: AppleInstallation | FcmV1Installation
): TE.TaskEither<Error, NotificationHubsResponse> =>
  TE.tryCatch(
    () => nhService.createOrUpdateInstallation(installation),
    // TODO: make this error more specific
    () => new Error("Error while creating or updating the installation")
  );

export { ActivityResultSuccess } from "../utils/durable/activities";

export type ActivityBodyImpl = ActivityBody<
  ActivityInput,
  ActivityResultSuccess
>;

export const getActivityBody = (
  buildNHService: (nhConfig: NotificationHubConfig) => NotificationHubsClient
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
): ActivityBodyImpl => ({ input, logger }) => {
  logger.info(`INSTALLATION_ID=${input.installationId}`);
  const nhService = buildNHService(input.notificationHubConfig);
  return pipe(
    input.installationId,
    getInstallationFromInstallationId(nhService),
    TE.chain(createInstallation),
    TE.chain(createOrUpdateInstallation(nhService)),
    TE.bimap(
      e => retryActivity(logger, toString(e)),
      installation =>
        ActivityResultSuccess.encode({ kind: "SUCCESS", ...installation })
    )
  );
};
