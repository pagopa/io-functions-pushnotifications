import * as t from "io-ts";

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
export const OrchestratorFailure = t.union([
  OrchestratorActivityFailure,
  OrchestratorInvalidInputFailure,
  OrchestratorUnhandledFailure
]);
