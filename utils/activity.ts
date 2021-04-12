import { Context } from "@azure/functions";
import { toError } from "fp-ts/lib/Either";
import * as t from "io-ts";

// Activity result
export const activityResultSuccess = t.interface({
  kind: t.literal("SUCCESS")
});
export type ActivityResultSuccess = t.TypeOf<typeof activityResultSuccess>;

export const activityResultFailure = t.interface({
  kind: t.literal("FAILURE"),
  reason: t.string
});

export type ActivityResultFailure = t.TypeOf<typeof activityResultFailure>;

export const activityResult = t.taggedUnion("kind", [
  activityResultSuccess,
  activityResultFailure
]);

export type ActivityResult = t.TypeOf<typeof activityResult>;

export const failure = (
  context: Context,
  logPrefix: string
): ((err: Error, description: string) => ActivityResult) => (
  err: Error,
  description: string = ""
): ActivityResult => {
  const logMessage =
    description === ""
      ? `${logPrefix}|FAILURE=${err.message}`
      : `${logPrefix}|${description}|FAILURE=${err.message}`;
  context.log.info(logMessage);
  return activityResultFailure.encode({
    kind: "FAILURE",
    reason: err.message
  });
};

export const failActivity = (
  context: Context,
  logPrefix: string
): ((errorMessage: string, errorDetails?: string) => ActivityResult) => (
  errorMessage: string,
  errorDetails?: string
): ActivityResult => {
  const details = errorDetails ? `|ERROR_DETAILS=${errorDetails}` : ``;
  context.log.error(`${logPrefix}|${errorMessage}${details}`);
  return activityResultFailure.encode({
    kind: "FAILURE",
    reason: errorMessage
  });
};

// trigger a rety in case the notification fail
export const retryActivity = (context: Context, msg: string): never => {
  context.log.error(msg);
  throw toError(msg);
};

export const success = (): ActivityResult =>
  activityResultSuccess.encode({
    kind: "SUCCESS"
  });
