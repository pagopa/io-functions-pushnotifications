import * as crypto from "crypto";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";

/**
 * Convert a string into SHA256
 *
 * @param source
 * @returns
 */
export const toSHA256 = (source: FiscalCode): string =>
  crypto
    .createHash("sha256")
    .update(source)
    .digest("hex");

/**
 * Utility function for printing a unknown object.
 * It replaces fp-ts `toString`
 */
export const toString = (err: unknown): string =>
  typeof err === "string"
    ? err
    : err instanceof Error
    ? err.message
    : JSON.stringify(err);
