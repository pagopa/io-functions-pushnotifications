import { Context } from "@azure/functions";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";
import * as t from "io-ts";
import { readableReport } from "@pagopa/ts-commons/lib/reporters";
import { ActivityLogger, createLogger } from "./log";
import {
  ActivityResultFailure,
  ActivityResultSuccess,
  failActivity
} from "./returnTypes";

export { createLogger } from "./log";
export * from "./returnTypes";

export type ActivityBody<
  Input = unknown,
  Success extends ActivityResultSuccess = ActivityResultSuccess,
  Failure extends ActivityResultFailure = ActivityResultFailure
> = (p: {
  readonly context: Context;
  readonly logger: ActivityLogger;
  readonly input: Input;
  // bindings?: Bindings;
}) => TE.TaskEither<Failure, Success>;

// All activity will return ActivityResultFailure, ActivityResultSuccess or some derived types
type ActivityResult<R extends ActivityResultSuccess | ActivityResultFailure> =
  | R
  | ActivityResultFailure
  | ActivityResultSuccess;

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
export const createActivity = <
  I extends unknown = unknown,
  S extends ActivityResultSuccess = ActivityResultSuccess,
  F extends ActivityResultFailure = ActivityResultFailure
>(
  activityName: string,
  InputCodec: t.Type<I>,
  OutputCodec: t.Type<S>,
  body: ActivityBody<I, S, F>
) => async (
  context: Context,
  rawInput: unknown
): Promise<ActivityResult<F | S>> => {
  const logger = createLogger(context, activityName);

  return pipe(
    rawInput,
    InputCodec.decode,
    TE.fromEither,
    TE.mapLeft(
      err =>
        failActivity(logger)(
          "Error decoding activity input",
          readableReport(err)
        ) as F
    ),
    TE.chain(input => body({ context, input, logger })),
    TE.map(e => OutputCodec.encode(e)),
    TE.toUnion
  )();
};
