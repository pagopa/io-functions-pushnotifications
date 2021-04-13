import { Context } from "@azure/functions";
import { identity } from "fp-ts/lib/function";
import { fromEither, TaskEither } from "fp-ts/lib/TaskEither";
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

export type ActivityBody<
  Input,
  Success extends ActivityResultSuccess = ActivityResultSuccess,
  Failure extends ActivityResultFailure = ActivityResultFailure
  // Bindings extends Array<unknown> = []
> = (p: {
  readonly context: Context;
  readonly logger: ActivityLogger;
  readonly input: Input;
  // bindings?: Bindings;
}) => TaskEither<Failure, Success>;

// extract the input type from an ActivityBody type
export type InputOfActivityBody<B extends ActivityBody<unknown>> = B extends (
  p: infer P
) => // eslint-disable-next-line @typescript-eslint/no-unused-vars
TaskEither<infer _, infer __>
  ? P extends { readonly context: Context; readonly input: infer I }
    ? I
    : never
  : never;

// extract the success type from an ActivityBody type
export type SuccessOfActivityBody<B extends ActivityBody<unknown>> = B extends (
  p: infer P
) => // eslint-disable-next-line @typescript-eslint/no-unused-vars
TaskEither<infer _, infer S> // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ? P extends { readonly context: Context; readonly input: infer __ }
    ? S extends ActivityResultSuccess
      ? S
      : never
    : never
  : never;

/**
 * Wraps an activity execution so that types are enforced and errors are handled consistently.
 * The purpose is to reduce boilerplate in activity implementation and let developers define only what it matters in terms of business logic
 *
 * @param activityName name of the activity (as it's defined in the Azure Runtime)
 * @param InputCodec an io-ts codec which maps the expected input structure
 * @param body the activity logic implementation
 * @param OutputCodec an io-ts codec which maps the expected output structure
 * @returns
 */
export const createActivity = <B extends ActivityBody<unknown>>(
  activityName: string,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  InputCodec: t.Type<InputOfActivityBody<B>>,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  OutputCodec: t.Type<SuccessOfActivityBody<B>>,
  body: B
) => async (
  context: Context,
  rawInput: unknown
): Promise<ActivityResultFailure | SuccessOfActivityBody<B>> => {
  // TODO: define type variable TNext so that
  const logger = createLogger(context, activityName);

  return (
    fromEither(InputCodec.decode(rawInput))
      .mapLeft(errs =>
        failActivity(logger)(
          "Error decoding activity input",
          readableReport(errs)
        )
      )
      // eslint-disable-next-line sort-keys
      .chain(input => body({ context, logger, input }))
      .map(OutputCodec.encode)
      .fold(identity, identity)
      .run()
  );
};
