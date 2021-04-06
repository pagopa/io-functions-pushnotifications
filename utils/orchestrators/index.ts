import * as df from "durable-functions";

import {
  IOrchestrationFunctionContext,
  Task
} from "durable-functions/lib/src/classes";
import { either, left, right } from "fp-ts/lib/Either";
import * as t from "io-ts";
import { readableReport } from "italia-ts-commons/lib/reporters";
import {
  ActivityResult,
  ActivityResultFailure,
  ActivityResultSuccess
} from "../activity";
import { createLogger, IOrchestratorLogger } from "./log";
import {
  failureActivity,
  failureInvalidInput,
  failureUnhandled,
  OrchestratorFailure,
  OrchestratorSuccess,
  success
} from "./returnTypes";

export { createLogger, IOrchestratorLogger as OrchestratorLogger } from "./log";
export * from "./returnTypes";

// TODO: define a more specific type so that OrchestratorBody must be strict in what it yields
type TNextDefault = unknown;

type OrchestratorBody<I, TNext> = (p: {
  context: IOrchestrationFunctionContext;
  logger: IOrchestratorLogger;
  input: I;
}) => Generator<Task, void, TNext>;

/**
 * Wraps an orchestrator execution so that types are enforced and errors are handled consistently.
 * The purpose is to reduce boilerplate in orchestrator implementation and let developers define only what it matters in terms of business logic
 * @param orchestratorName name of the orchestrator (as it's defined in the Azure Runtime)
 * @param InputCodec an io-ts codec which maps the expected input structure
 * @param body a generator function which implements the business logic; it's meant to either return void or throw respectively in case of success or failure
 * @returns a generator functions which implements a valid Azure Durable Functions Orchestrator
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
      const input = InputCodec.decode(rawInput).getOrElseL(err => {
        throw failureInvalidInput(rawInput, `${readableReport(err)}`);
      });

      yield* body({ context, logger, input });

      return success();
    } catch (error) {
      const failure = OrchestratorFailure.decode(error).getOrElse(
        failureUnhandled(error)
      );
      logger.error(failure);

      return failure;
    }
  };

/**
 * Wraps the call of an activity without return values
 * and the check of the activity result
 * @param activityName name of the activity to call
 * @param context The Azure function context
 * @param input the activity input
 * @param retryOptions the retry option
 * @returns a generator functions which return "SUCCESS" or throw an OrchestratorActivityFailure exception
 */
export function* callActivity<I>(
  activityName: string,
  context: IOrchestrationFunctionContext,
  input: I,
  retryOptions: df.RetryOptions
): Generator<Task, "SUCCESS"> {
  const result = yield context.df.callActivityWithRetry(
    activityName,
    retryOptions,
    input
  );

  return either
    .of<ActivityResultFailure | Error, unknown>(result)
    .chain(r =>
      ActivityResult.decode(r).mapLeft(
        e =>
          new Error(
            `Cannot decode result from ${activityName}, err: ${readableReport(
              e
            )}`
          )
      )
    )
    .chain<ActivityResultSuccess>(r =>
      ActivityResultSuccess.is(r) ? right(r) : left(r)
    )
    .fold(
      // In case of failure, trow a failure object with the activity name
      e => {
        throw failureActivity(
          activityName,
          e instanceof Error ? e.message : e.reason
        );
      },
      _ => "SUCCESS" as const
    );
}
