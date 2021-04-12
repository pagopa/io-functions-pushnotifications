import { Context } from "@azure/functions";
import { sequenceT } from "fp-ts/lib/Apply";
import { either } from "fp-ts/lib/Either";
import { identity } from "fp-ts/lib/function";
import { fromEither, taskEither, TaskEither } from "fp-ts/lib/TaskEither";
import * as t from "io-ts";
import { readableReport } from "italia-ts-commons/lib/reporters";
import { ActivityLogger, createLogger } from "./log";
import {
  ActivityResultFailure,
  ActivityResultSuccess,
  failActivity
} from "./returnTypes";

export { createLogger } from "./log";
export * from "./returnTypes";

/**
 * Defines the structure of an activity body function
 * @param Input the type of the input expected by the activity
 * @param Success the type which defines a successuful result for the activity
 * @param Failure the type which defines an unsuccessuful result for the activity
 * @param Bindings an optional record type with the activity bindings
 */
export type ActivityBody<
  Input = unknown,
  Success extends ActivityResultSuccess = ActivityResultSuccess,
  Failure extends ActivityResultFailure = ActivityResultFailure,
  Bindings extends { [key: string]: unknown } = {}
> = (p: {
  // the context of the whole activity, with type-annotated bindings
  context: Context & { bindings: Bindings };
  // a logget instance for the activity
  logger: ActivityLogger;
  // the provided input, decoded
  input: Input;
  // the provided bindings, decoded
  bindings?: Bindings;
}) => TaskEither<Failure, Success>;

// extract the input type from an ActivityBody type
export type InputOfActivityBody<B extends ActivityBody> = B extends (
  p: infer P
) => TaskEither<infer _, infer __>
  ? P extends { context: Context; input: infer I }
    ? I
    : never
  : never;

// extract the type of the optional bindings from an ActivityBody type
export type BindingsOfActivityBody<B extends ActivityBody> = B extends (
  p: infer P
) => TaskEither<infer _, infer __>
  ? P extends { context: Context; bindings: infer BN }
    ? BN
    : unknown
  : never;

// extract the success type from an ActivityBody type
export type SuccessOfActivityBody<B extends ActivityBody> = B extends (
  p: infer P
) => TaskEither<infer _, infer S>
  ? P extends { context: Context; input: infer __ }
    ? S extends ActivityResultSuccess
      ? S
      : never
    : never
  : never;

/**
 * Wraps an activity execution so that types are enforced and errors are handled consistently.
 * The purpose is to reduce boilerplate in activity implementation and let developers define only what it matters in terms of business logic
 * @param activityName name of the activity (as it's defined in the Azure Runtime)
 * @param InputCodec an io-ts codec which maps the expected input structure
 * @param OutputCodec an io-ts codec which maps the expected output structure
 * @param body the activity logic implementation
 * @param BindingsCodec (optional) an io-ts codec which maps the expected output structure
 * @returns
 */
export const createActivity = <B extends ActivityBody>(
  activityName: string,
  InputCodec: t.Type<InputOfActivityBody<B>>,
  OutputCodec: t.Type<SuccessOfActivityBody<B>>,
  body: B,
  BindingsCodec?: t.Type<BindingsOfActivityBody<B>>
) => async (
  context: Context,
  rawInput: unknown
): Promise<ActivityResultFailure | SuccessOfActivityBody<B>> => {
  const logger = createLogger(context, activityName);

  return fromEither(
    sequenceT(either)(
      InputCodec.decode(rawInput).mapLeft(errs => [
        "Error decoding activity input",
        readableReport(errs)
      ]),
      (BindingsCodec || t.UnknownRecord)
        .decode(context.bindings)
        .mapLeft(errs => [
          "Error decoding activity bindings",
          readableReport(errs)
        ])
    )
  )
    .mapLeft(([msg, details]) => failActivity(logger)(msg, details))
    .chain(([input, bindings]) => body({ context, logger, input, bindings }))
    .map(OutputCodec.encode)
    .fold(identity, identity)
    .run();
};
