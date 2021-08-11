import * as E from "fp-ts/lib/Either";
import { identity, pipe } from "fp-ts/lib/function";
import * as t from "io-ts";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";

/**
 * Parses a string into a deserialized json
 */
export type JSONFromString = t.TypeOf<typeof jsonFromString>;
export const jsonFromString = new t.Type<object, string>( // eslint-disable-line @typescript-eslint/ban-types
  "JSONFromString",
  t.UnknownRecord.is,
  (m, c) =>
    pipe(
      t.string.validate(m, c),
      E.chain(s =>
        pipe(
          E.tryCatch(
            () => t.success(JSON.parse(s)),
            _ => t.failure(s, c)
          ),
          E.fold(identity, identity)
        )
      )
    ),
  String
);

/**
 * A coded which creates RegExp from strings
 */
export type RegExpFromString = t.TypeOf<typeof RegExpFromString>;
export const RegExpFromString = new t.Type<RegExp, string>(
  "RegExpFromString",
  (v: unknown): v is RegExp => v instanceof RegExp,
  (v, c): t.Validation<RegExp> =>
    v instanceof RegExp
      ? t.success(v)
      : typeof v === "string"
      ? t.success(new RegExp(v))
      : t.failure(v, c),
  (v: RegExp | string): string => (typeof v === "string" ? v : v.source)
);

/**
 * Define the structure of a partition definition
 */
export type NotificationHubPartition = t.TypeOf<
  typeof NotificationHubPartition
>;
export const NotificationHubPartition = t.interface({
  endpoint: NonEmptyString,
  name: NonEmptyString,
  partitionRegex: RegExpFromString
});

/**
 * A codec that ensures that, given an array of partition definitions,
 * they cover the entire space pf HEX characters without overlap or leaving gapes
 */
export type DisjoitedNotificationHubPartitionArray = t.TypeOf<
  typeof DisjoitedNotificationHubPartitionArray
>;
export const DisjoitedNotificationHubPartitionArray = t.refinement(
  t.readonlyArray(NotificationHubPartition),
  array => {
    const partitionsRegex = array.map(a => a.partitionRegex);
    const initialHexCharacter = Array.from({ length: 16 }, (_, i) =>
      i.toString(16)
    );
    // Regex must all check fist character
    const useFirstLetter = !partitionsRegex.some(
      r => !r.toString().includes("^")
    );

    // Partitions needs to be complete and disjoint
    const oneAndOnlyPartition = !initialHexCharacter.some(
      hex => partitionsRegex.filter(regex => regex.test(hex)).length !== 1
    );

    return useFirstLetter && oneAndOnlyPartition;
  },
  "DisjoitedNotificationHubPartitionArray"
);
