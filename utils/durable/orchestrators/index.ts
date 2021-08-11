import {
  IOrchestrationFunctionContext,
  RetryOptions,
  Task
} from "durable-functions/lib/src/classes";
import { left, right } from "fp-ts/lib/Either";
import * as E from "fp-ts/lib/Either";
import { flow, identity, pipe } from "fp-ts/lib/function";
import * as t from "io-ts";
import { readableReport } from "@pagopa/ts-commons/lib/reporters";
import {
  ActivityResult,
  ActivityResultFailure,
  ActivityResultSuccess
} from "../activities";
import { createLogger, IOrchestratorLogger } from "./log";
import {
  failureActivity,
  failureInvalidInput,
  failureUnhandled,
  OrchestratorFailure,
  OrchestratorSuccess,
  success
} from "./returnTypes";
import { decodeOrError } from "../utils";

export { createLogger, IOrchestratorLogger as OrchestratorLogger } from "./log";
export * from "./returnTypes";

// TODO: define a more specific type so that OrchestratorBody must be strict in what it yields
type TNextDefault = unknown;

type OrchestratorBody<I, TNext> = (p: {
  readonly context: IOrchestrationFunctionContext;
  readonly logger: IOrchestratorLogger;
  readonly input: I;
}) => Generator<Task, void, TNext>;

/**
 * Wraps an orchestrator execution so that types are enforced and errors are handled consistently.
 * The purpose is to reduce boilerplate in orchestrator implementation and let developers define only what it matters in terms of business logic
 *
 * @param orchestratorName name of the orchestrator (as it's defined in the Azure Runtime)
 * @param InputCodec an io-ts codec which maps the expected input structure
 * @param body a generator function which implements the business logic; it's meant to either return void or throw respectively in case of success or failure
 * @returns a generator functions which implementa a valid Azure Durable Functions Orchestrator
 */
export const createOrchestrator = <I, TNext = TNextDefault>(
  orchestratorName: string,
  InputCodec: t.Type<I>,
  body: OrchestratorBody<I, TNext>
) =>
  function*(
    context: IOrchestrationFunctionContext
  ): Generator<Task, OrchestratorFailure | OrchestratorSuccess, TNext> {
    // TODO: define type variable TNext so that
    const logger = createLogger(context, orchestratorName);

    // Get and decode orchestrator input
    const rawInput = context.df.getInput();

    try {
      const input = pipe(
        rawInput,
        InputCodec.decode,
        E.getOrElseW(err => {
          throw failureInvalidInput(rawInput, `${readableReport(err)}`);
        })
      );

      // eslint-disable-next-line sort-keys
      yield* body({ context, logger, input });

      return success();
    } catch (error) {
      const failure = pipe(
        error,
        OrchestratorFailure.decode,
        E.getOrElseW(() => failureUnhandled(error))
      );
      logger.error(failure);

      context.df.setCustomStatus(failure);
      throw failure;
    }
  };

export type CallableActivity<
  I extends unknown = unknown,
  S extends ActivityResultSuccess = ActivityResultSuccess,
  // Failures aren't mapped as they are thrown
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/naming-convention
  __ extends ActivityResultFailure = ActivityResultFailure
> = (context: IOrchestrationFunctionContext, input: I) => Generator<Task, S>;

/**
 * Creates a callable for an activity to be used into an orchestrator function.
 * Types are enforced from a ActivityBody definition so that they are bound to the actual activity implementation
 *
 * @param activityName the name of the activity to be called
 * @param OutputCodec a codec for the result value
 * @param retryOptions if provided, the activity will be retried when failing
 * @returns a generator function which takes an orchestrator context and an input for the activity
 */
export const callableActivity = <
  I extends unknown = unknown,
  S extends ActivityResultSuccess = ActivityResultSuccess,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/naming-convention
  __ extends ActivityResultFailure = ActivityResultFailure
>(
  activityName: string,
  OutputCodec: t.Type<S>,
  retryOptions?: RetryOptions
) =>
  function*(
    context: IOrchestrationFunctionContext,
    input: I
  ): Generator<Task, S> {
    // eslint-disable-next-line functional/no-let
    let result: unknown;
    try {
      result = yield typeof retryOptions === "undefined"
        ? context.df.callActivity(activityName, input)
        : context.df.callActivityWithRetry(activityName, retryOptions, input);
    } catch (e) {
      throw failureActivity(
        activityName,
        e instanceof Error ? e.message : e.reason
      );
    }
    return pipe(
      result,
      E.of,
      E.chain(
        decodeOrError(
          ActivityResult,
          `Cannot decode result from ${activityName}`
        )
      ),
      E.chainW(r => (ActivityResultFailure.is(r) ? left(r) : right(r))),
      E.chainW(
        decodeOrError(OutputCodec, `Invalid output value from ${activityName}`)
      ),
      E.fold(
        // In case of failure, trow a failure object with the activity name
        e => {
          throw failureActivity(
            activityName,
            e instanceof Error ? e.message : e.reason
          );
        },
        identity
      )
    );
  };
