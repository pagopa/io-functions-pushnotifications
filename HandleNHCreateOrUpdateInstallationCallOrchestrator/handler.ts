import { TelemetryClient } from "applicationinsights";

import { Task } from "durable-functions/lib/src/classes";
import * as t from "io-ts";

import * as o from "../utils/durable/orchestrators";
import { NotificationHubConfig } from "../utils/notificationhubServicePartition";

import { CreateOrUpdateInstallationMessage } from "../generated/notifications/CreateOrUpdateInstallationMessage";
import { ActivityInput as CreateOrUpdateActivityInput } from "../HandleNHCreateOrUpdateInstallationCallActivity";
import {
  ActivityInput as IsUserInActiveSubsetActivityInput,
  ActivityResultSuccessWithValue as IsUserInActiveSubsetResultSuccess
} from "../IsUserInActiveSubsetActivity";

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
  readonly createOrUpdateActivity: o.CallableActivity<
    CreateOrUpdateActivityInput
  >;
  readonly isUserInActiveTestSubsetActivity: o.CallableActivity<
    IsUserInActiveSubsetActivityInput,
    IsUserInActiveSubsetResultSuccess
  >;
  readonly notificationHubConfig: NotificationHubConfig;

  readonly telemetryClient: TelemetryClient;

  readonly featureFlag: string;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const getHandler = ({
  createOrUpdateActivity,
  isUserInActiveTestSubsetActivity,
  notificationHubConfig,
  telemetryClient,
  featureFlag
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
      logger.info(
        `INSTALLATION_ID:${installationId}|IS_TEST_USER:${isUserATestUser.value}`
      );

      if (!context.df.isReplaying) {
        telemetryClient.trackEvent({
          name: "orchestrators.createOrUpdate.isTestUser",
          properties: {
            featureFlag,
            installationId,
            isTestUser: isUserATestUser.value
          },
          tagOverrides: { samplingEnabled: "false" }
        });
      }

      yield* createOrUpdateActivity(context, {
        installationId,
        notificationHubConfig,
        platform,
        pushChannel,
        tags
      });
    }
  );
