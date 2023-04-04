/* eslint-disable @typescript-eslint/explicit-function-return-type */
import * as express from "express";
import { wrapRequestHandler } from "@pagopa/io-functions-commons/dist/src/utils/request_middleware";
import {
  IResponseErrorInternal,
  IResponseSuccessJson,
  ResponseErrorInternal,
  ResponseSuccessJson
} from "@pagopa/ts-commons/lib/responses";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";
import * as healthcheck from "@pagopa/io-functions-commons/dist/src/utils/healthcheck";
import * as t from "io-ts";
import * as packageJson from "../package.json";

import { checkAzureNotificationHub } from "../utils/healthcheck";
import { envConfig, IConfig } from "../utils/config";

interface IInfo {
  readonly name: string;
  readonly version: string;
}

type InfoHandler = () => Promise<
  IResponseSuccessJson<IInfo> | IResponseErrorInternal
>;

type HealthChecker = (
  config: unknown
) => healthcheck.HealthCheck<
  "AzureStorage" | "Config" | "AzureNotificationHub",
  true
>;

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
export function InfoHandler(healthCheck: HealthChecker): InfoHandler {
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  return () =>
    pipe(
      envConfig,
      healthCheck,
      TE.mapLeft(problems => ResponseErrorInternal(problems.join("\n\n"))),
      TE.map(_ =>
        ResponseSuccessJson({
          name: packageJson.name,
          version: packageJson.version
        })
      ),
      TE.toUnion
    )();
}

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
export function Info(): express.RequestHandler {
  const handler = InfoHandler(
    healthcheck.checkApplicationHealth(IConfig, [
      c =>
        healthcheck.checkAzureStorageHealth(
          c.NOTIFICATIONS_STORAGE_CONNECTION_STRING
        ),
      c => checkAzureNotificationHub(c.AZURE_NH_ENDPOINT, c.AZURE_NH_HUB_NAME),
      ...[0, 1, 2, 3].map(i => (c: t.TypeOf<typeof IConfig>) =>
        checkAzureNotificationHub(
          c.AZURE_NOTIFICATION_HUB_PARTITIONS[i].endpoint,
          c.AZURE_NOTIFICATION_HUB_PARTITIONS[i].name
        )
      )
    ])
  );

  return wrapRequestHandler(handler);
}
