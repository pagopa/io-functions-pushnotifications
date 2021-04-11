import { toString } from "fp-ts/lib/function";

/**
 * Exhaustive check function
 * @param value The value to check
 * @param message The error message to throw in case of runtime error
 */
export function assertNever(
  value: never,
  message: string = `Exhaustive check failed. Unexpected value: ${toString(
    value
  )}`
): never {
  throw new Error(message);
}
