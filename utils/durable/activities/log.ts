import { Context, Logger } from "@azure/functions";

export type ActivityLogger = Logger;

/**
 * Creates a logger object which is bound to an activity context
 *
 * @param {Context} context the context of execution of the activity
 * @param {string} logPrefix a string to prepend to every log entry, usually the name of the activity. Default: empty string
 * @returns {Logger} a logger instance
 */
export const createLogger = (
  context: Context,
  logPrefix: string = ""
): ActivityLogger =>
  new Proxy(context.log, {
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    get: (t, key) =>
      // wrap logger functions
      key === "info" || key === "error" || key === "info" || key === "verbose"
        ? // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
          (arg0: string) => t[key](`${logPrefix}|${arg0}`)
        : // for other props, just return them
        key in t
        ? // tslint:disable-next-line:no-useless-cast
          t[key as keyof typeof t] // we need this cast in order to tell TS that key is actually part of Logger
        : // else, the propo does not exists so it's just undefined
          undefined
  });
