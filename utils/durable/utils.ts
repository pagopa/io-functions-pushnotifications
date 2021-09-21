import { flow } from "fp-ts/lib/function";
import * as t from "io-ts";
import * as E from "fp-ts/lib/Either";
import { readableReport } from "@pagopa/ts-commons/lib/reporters";

/**
 * Util function that takes a generator and executes each step until is done.
 * It is meant to be a test utility
 *
 * @param gen a generator function
 * @returns the last value yielded by the generator
 */
export const consumeGenerator = <TReturn = unknown>(
  gen: Generator<unknown, TReturn, unknown>
): TReturn => {
  // eslint-disable-next-line functional/no-let
  let prevValue: unknown;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = gen.next(prevValue);
    if (done) {
      return value as TReturn;
    }
    prevValue = value;
  }
};

/**
 * Utility function for printing a unknown object.
 * It replaces fp-ts `toString`
 */
export const toString: (x: unknown) => string = JSON.stringify;

/**
 * Decode or return an error
 *
 * @param OutputCodec
 * @param error
 * @returns
 */
export const decodeOrError = <S>(
  OutputCodec: t.Type<S>,
  error: string
): ((value: unknown) => E.Either<Error, S>) =>
  flow(
    OutputCodec.decode,
    E.mapLeft(readableReport),
    E.mapLeft(r => new Error(`${error}. Err: ${r}`))
  );
