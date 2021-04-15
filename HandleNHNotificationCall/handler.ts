import { Context } from "@azure/functions";
import * as df from "durable-functions";
import * as t from "io-ts";

import { CreateOrUpdateInstallationMessage } from "../generated/notifications/CreateOrUpdateInstallationMessage";
import { DeleteInstallationMessage } from "../generated/notifications/DeleteInstallationMessage";
import { NotifyMessage } from "../generated/notifications/NotifyMessage";

import { KindEnum as CreateOrUpdateKind } from "../generated/notifications/CreateOrUpdateInstallationMessage";
import { KindEnum as DeleteKind } from "../generated/notifications/DeleteInstallationMessage";
import { KindEnum as NotifyKind } from "../generated/notifications/NotifyMessage";

import { OrchestratorName as CreateOrUpdateInstallationOrchestrator } from "../HandleNHCreateOrUpdateInstallationCallOrchestrator/handler";
import { OrchestratorName as DeleteInstallationOrchestratorName } from "../HandleNHDeleteInstallationCallOrchestrator/handler";
import { OrchestratorName as NotifyMessageOrchestratorName } from "../HandleNHNotifyMessageCallOrchestrator/handler";

export const NotificationMessage = t.union([
  NotifyMessage,
  CreateOrUpdateInstallationMessage,
  DeleteInstallationMessage
]);

export type NotificationHubMessage = t.TypeOf<typeof NotificationMessage>;

/**
 * Invoke Orchestrator to manage Notification Hub Service call with data provided by an enqued message
 */
export const getHandler = () => async (
  context: Context,
  notificationHubMessage: NotificationHubMessage
): Promise<string> => {
  const client = df.getClient(context);

  // eslint-disable-next-line default-case
  switch (notificationHubMessage.kind) {
    case DeleteKind.DeleteInstallation:
      return client.startNew(DeleteInstallationOrchestratorName, undefined, {
        message: notificationHubMessage
      });
    case CreateOrUpdateKind.CreateOrUpdateInstallation:
      return client.startNew(
        CreateOrUpdateInstallationOrchestrator,
        undefined,
        {
          message: notificationHubMessage
        }
      );
    case NotifyKind.Notify:
      return client.startNew(NotifyMessageOrchestratorName, undefined, {
        message: notificationHubMessage
      });
  }
};
