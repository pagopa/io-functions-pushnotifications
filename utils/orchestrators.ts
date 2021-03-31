import * as ai from "applicationinsights";
import { IOrchestrationFunctionContext } from "durable-functions/lib/src/iorchestrationfunctioncontext";
import * as t from "io-ts";
import { readableReport } from "italia-ts-commons/lib/reporters";

export const trackExceptionAndThrow = (
  context: IOrchestrationFunctionContext,
  aiTelemetry: ai.TelemetryClient,
  logPrefix: string
) => (err: Error | t.Errors, name: string) => {
  const errMessage = err instanceof Error ? err.message : readableReport(err);
  context.log.verbose(`${logPrefix}|ERROR=${errMessage}`);
  aiTelemetry.trackException({
    exception: new Error(`${logPrefix}|ERROR=${errMessage}`),
    properties: {
      name
    }
  });
  throw new Error(errMessage);
};
