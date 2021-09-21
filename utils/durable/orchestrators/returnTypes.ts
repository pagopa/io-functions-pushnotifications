import * as t from "io-ts";
import { toString } from "../utils";

export type OrchestratorSuccess = t.TypeOf<typeof OrchestratorSuccess>;
export const OrchestratorSuccess = t.interface({
  kind: t.literal("SUCCESS")
});

export type OrchestratorInvalidInputFailure = t.TypeOf<
  typeof OrchestratorInvalidInputFailure
>;
export const OrchestratorInvalidInputFailure = t.interface({
  input: t.unknown,
  kind: t.literal("FAILURE_INVALID_INPUT"),
  reason: t.string
});

export type OrchestratorActivityFailure = t.TypeOf<
  typeof OrchestratorActivityFailure
>;
export const OrchestratorActivityFailure = t.interface({
  activityName: t.string,
  kind: t.literal("FAILURE_ACTIVITY"),
  reason: t.string
});

export type OrchestratorUnhandledFailure = t.TypeOf<
  typeof OrchestratorUnhandledFailure
>;
export const OrchestratorUnhandledFailure = t.interface({
  kind: t.literal("FAILURE_UNHANDLED"),
  reason: t.string
});

export type OrchestratorFailure = t.TypeOf<typeof OrchestratorFailure>;
export const OrchestratorFailure = t.taggedUnion("kind", [
  OrchestratorActivityFailure,
  OrchestratorInvalidInputFailure,
  OrchestratorUnhandledFailure
]);

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const success = () => OrchestratorSuccess.encode({ kind: "SUCCESS" });

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const failureInvalidInput = (input: unknown, reason: string) =>
  OrchestratorInvalidInputFailure.encode({
    input,
    kind: "FAILURE_INVALID_INPUT",
    reason
  });

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const failureActivity = (activityName: string, reason: string) =>
  OrchestratorActivityFailure.encode({
    activityName,
    kind: "FAILURE_ACTIVITY",
    reason
  });

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const failureUnhandled = (error: unknown) =>
  OrchestratorUnhandledFailure.encode({
    kind: "FAILURE_UNHANDLED",
    reason: error instanceof Error ? error.message : toString(error)
  });
