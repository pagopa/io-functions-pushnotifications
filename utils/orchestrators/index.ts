import * as t from "io-ts";
import {
  IOrchestrationFunctionContext,
  Task
} from "durable-functions/lib/src/classes";
import { createLogger, OrchestratorLogger } from "./log";
import { readableReport } from "italia-ts-commons/lib/reporters";
import {
  OrchestratorSuccess,
  failureInvalidInput,
  failureUnhandled,
  success,
  OrchestratorFailure
} from "./returnTypes";

export { createLogger, OrchestratorLogger } from "./log";
export * from "./returnTypes";

// TODO: define a more specific type so that OrchestratorBody must be strict in what it yields
type TNextDefault = unknown;

interface OrchestratorBodyParams<I> {
  context: IOrchestrationFunctionContext;
  logger: OrchestratorLogger;
  input: I;
}
interface OrchestratorBody<I, TNext> {
  (p: OrchestratorBodyParams<I>): Generator<Task, void, TNext>;
}

/**
 * Wraps an orchestrator execution so that types are enforced and errors are handled consistently.
 * The purpose is to reduce boilerplate in orchestrator implementation and let developers define only what it matters in terms of business logic
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
    //TODO: define type variable TNext so that
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
