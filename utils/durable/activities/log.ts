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
    get: (t, key) => {
      switch (key) {
        case "info":
        case "error":
        case "warn":
        case "verbose":
          // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
          return (arg0: string) => t[key](`${logPrefix}|${arg0}`);
        default:
          return t[key];
      }
    }
  });
