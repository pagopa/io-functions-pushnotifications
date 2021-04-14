import { Context } from "@azure/functions";
import * as df from "durable-functions";
import { toString } from "fp-ts/lib/function";
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

// eslint-disable-next-line @typescript-eslint/naming-convention
export const NotificationMessage = t.union([
  NotifyMessage,
  CreateOrUpdateInstallationMessage,
  DeleteInstallationMessage
]);

export type NotificationHubMessage = t.TypeOf<typeof NotificationMessage>;

const assertNever = (x: never): never => {
  throw new Error(`Unexpected object: ${toString(x)}`);
};

/**
 * Invoke Orchestrator to manage Notification Hub Service call with data provided by an enqued message
 */
export const getHandler = () => async (
  context: Context,
  notificationHubMessage: NotificationHubMessage
): Promise<void> => {
  const client = df.getClient(context);
  switch (notificationHubMessage.kind) {
    case DeleteKind.DeleteInstallation:
      await client.startNew(DeleteInstallationOrchestratorName, undefined, {
        message: notificationHubMessage
      });
      break;
    case CreateOrUpdateKind.CreateOrUpdateInstallation:

      await client.startNew(CreateOrUpdateInstallationOrchestrator, undefined, {
        message: notificationHubMessage
      });
      break;
    case NotifyKind.Notify:
      await client.startNew(NotifyMessageOrchestratorName, undefined, {
        message: notificationHubMessage
      });
      break;
    default:
      assertNever(notificationHubMessage);
      break;
  }
};
