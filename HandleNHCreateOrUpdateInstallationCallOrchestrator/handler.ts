/* eslint-disable @typescript-eslint/no-unused-vars */
import { Task } from "durable-functions/lib/src/classes";
import * as t from "io-ts";
import { toString } from "fp-ts/lib/function";

import * as o from "../utils/durable/orchestrators";
import { failureUnhandled } from "../utils/durable/orchestrators";

import {
  getNotificationHubPartitionConfig,
  NotificationHubConfig
} from "../utils/notificationhubServicePartition";

import { CreateOrUpdateInstallationMessage } from "../generated/notifications/CreateOrUpdateInstallationMessage";

import { getCallableActivity as getCreateOrUpdateCallableActivity } from "../HandleNHCreateOrUpdateInstallationCallActivity";
import { getCallableActivity as getDeleteInstallationCallableActivity } from "../HandleNHDeleteInstallationCallActivity";
import { getCallableActivity as getIsUserInActiveSubsetActivityCallableActivity } from "../IsUserInActiveSubsetActivity";

export const OrchestratorName =
  "HandleNHCreateOrUpdateInstallationCallOrchestrator";

/**
 * Carries information about Notification Hub Message payload
 */
export const NhCreateOrUpdateInstallationOrchestratorCallInput = t.interface({
  message: CreateOrUpdateInstallationMessage
});

export type NhCreateOrUpdateInstallationOrchestratorCallInput = t.TypeOf<
  typeof NhCreateOrUpdateInstallationOrchestratorCallInput
>;

interface IHandlerParams {
  readonly createOrUpdateActivity: ReturnType<
    typeof getCreateOrUpdateCallableActivity
  >;
  readonly deleteInstallationActivity: ReturnType<
    typeof getDeleteInstallationCallableActivity
  >;
  readonly isUserInActiveTestSubsetActivity: ReturnType<
    typeof getIsUserInActiveSubsetActivityCallableActivity
  >;
  readonly legacyNotificationHubConfig: NotificationHubConfig;
  readonly notificationHubConfigPartitionChooser: ReturnType<
    typeof getNotificationHubPartitionConfig
  >;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const getHandler = ({
  createOrUpdateActivity,
  deleteInstallationActivity,
  isUserInActiveTestSubsetActivity,
  legacyNotificationHubConfig,
  notificationHubConfigPartitionChooser
}: IHandlerParams) =>
  o.createOrchestrator(
    OrchestratorName,
    NhCreateOrUpdateInstallationOrchestratorCallInput,
    function*({
      context,
      input: {
        message: { installationId, platform, pushChannel, tags }
      },
      logger
    }): Generator<Task, void, Task> {
      // just for logging for now
      const isUserATestUser = yield* isUserInActiveTestSubsetActivity(context, {
        installationId
      });

      if (isUserATestUser.value) {
        logger.info(`TEST_USER:${installationId}`);

        const notificationHubConfigPartition = notificationHubConfigPartitionChooser(
          installationId
        );

        try {
          yield* createOrUpdateActivity(context, {
            installationId,
            notificationHubConfig: notificationHubConfigPartition,
            platform,
            pushChannel,
            tags
          });

          // Always delete installation from legacy Notification Hub
          yield* deleteInstallationActivity(context, {
            installationId,
            notificationHubConfig: legacyNotificationHubConfig
          });
        } catch (err) {
          // ^In case of exception, delete from partition and restore into legacy NH

          logger.error(
            failureUnhandled(
              `ERROR|TEST_USER ${installationId}: ${toString(err)}`
            )
          );

          yield* createOrUpdateActivity(context, {
            installationId,
            notificationHubConfig: legacyNotificationHubConfig,
            platform,
            pushChannel,
            tags
          });

          yield* deleteInstallationActivity(context, {
            installationId,
            notificationHubConfig: notificationHubConfigPartition
          });

          throw err;
        }
      } else {
        // Call legacy Notification Hub otherwise
        yield* createOrUpdateActivity(context, {
          installationId,
          notificationHubConfig: legacyNotificationHubConfig,
          platform,
          pushChannel,
          tags
        });
      }
    }
  );
