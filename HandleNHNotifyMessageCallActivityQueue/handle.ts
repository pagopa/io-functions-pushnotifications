import { flow, pipe } from "fp-ts/lib/function";
import * as t from "io-ts";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import { TelemetryClient } from "applicationinsights";
import { NotifyMessage } from "../generated/notifications/NotifyMessage";
import { errorsToError } from "../IsUserInActiveSubsetActivity/handler";
import {
  buildNHService,
  getNotificationHubPartitionConfig,
  NotificationHubConfig
} from "../utils/notificationhubServicePartition";
import { toSHA256 } from "../utils/conversions";
import { notify } from "../utils/notification";
import {
  Failure,
  throwTransientFailure,
  toPermanentFailure,
  toTransientFailure
} from "../utils/errors";

export const NhTarget = t.union([t.literal("current"), t.literal("legacy")]);
export type NhTarget = t.TypeOf<typeof NhTarget>;

export const NhNotifyMessageRequest = t.interface({
  message: NotifyMessage,
  target: NhTarget
});
export type NhNotifyMessageRequest = t.TypeOf<typeof NhNotifyMessageRequest>;

export const handle = (
  inputRequest: unknown,
  legacyNotificationHubConfig: NotificationHubConfig,
  notificationHubConfigPartitionChooser: ReturnType<
    typeof getNotificationHubPartitionConfig
  >,
  fiscalCodeNotificationBlacklist: ReadonlyArray<FiscalCode>,
  telemetryClient: TelemetryClient
): Promise<Failure | { readonly kind: string }> =>
  pipe(
    inputRequest,
    NhNotifyMessageRequest.decode,
    E.mapLeft(flow(errorsToError, toPermanentFailure)),
    TE.fromEither,
    TE.bindTo("request"),
    TE.bind(
      "nhConfig",
      ({
        request: {
          message: { installationId },
          target
        }
      }) =>
        TE.of(
          target === "legacy"
            ? legacyNotificationHubConfig
            : notificationHubConfigPartitionChooser(installationId)
        )
    ),
    TE.chain(({ request: { message }, nhConfig }) =>
      pipe(
        { kind: "SUCCESS", skipped: true },
        TE.fromPredicate(
          () =>
            fiscalCodeNotificationBlacklist
              .map(toSHA256)
              .includes(message.installationId),
          () => "execute notify"
        ),
        TE.orElseW(() =>
          pipe(
            notify(
              buildNHService(nhConfig),
              message.installationId,
              message.payload
            ),
            TE.map(() => ({ kind: "SUCCESS", skipped: false }))
          )
        ),
        TE.mapLeft(toTransientFailure),
        TE.map(result => {
          telemetryClient.trackEvent({
            name: "api.messages.notification.push.sent",
            properties: {
              dryRun: !!result.skipped,
              installationId: message.installationId,
              isSuccess: "true",
              messageId: message.payload.message_id,
              notificationHub: nhConfig.AZURE_NH_HUB_NAME
            },
            tagOverrides: { samplingEnabled: "false" }
          });

          return result;
        })
      )
    ),
    TE.mapLeft(throwTransientFailure),
    TE.toUnion
  )();
