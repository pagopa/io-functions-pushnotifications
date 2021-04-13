import { tryCatch2v } from "fp-ts/lib/Either";
import { identity } from "fp-ts/lib/function";
import * as t from "io-ts";
import { NonEmptyString } from "italia-ts-commons/lib/strings";

export type JSONFromString = t.TypeOf<typeof jsonFromString>;
/**
 * Parses a string into a deserialized json
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export const jsonFromString = new t.Type<object, string>(
  "JSONFromString",
  t.object.is,
  (m, c) =>
    t.string.validate(m, c).chain(s =>
      tryCatch2v(
        () => t.success(JSON.parse(s)),
        _ => t.failure(s, c)
      ).fold(identity, identity)
    ),
  String
);

export type NotificationHubPartitions = t.TypeOf<
  typeof notificationHubPartitions
>;
const notificationHubPartitions = t.interface({
  name: NonEmptyString,
  namespace: NonEmptyString,
  partitionRegex: NonEmptyString,
  sharedAccessKey: NonEmptyString
});

export type NHDisjoitedFirstCharacterPartitionReadonlyArray = t.TypeOf<
  typeof nhDisjoitedFirstCharacterPartitionReadonlyArray
>;
export const nhDisjoitedFirstCharacterPartitionReadonlyArray = t.refinement(
  jsonFromString.pipe(t.readonlyArray(notificationHubPartitions)),
  array => {
    const partitionsRegex = array.map(a => a.partitionRegex);
    const initialHexCharacter = Array.from({ length: 16 }, (_, i) =>
      i.toString(16)
    );
    // Regex must all check fist character
    const useFirstLetter = !partitionsRegex.some(r => !r.includes("^"));

    // Partitions needs to be complete and disjoint
    const oneAndOnlyPartition = !initialHexCharacter.some(
      hex =>
        partitionsRegex.filter(regex => new RegExp(regex).test(hex)).length !==
        1
    );
    return useFirstLetter && oneAndOnlyPartition;
  },
  "nhDisjoitedFirstCharacterPartitionReadonlyArray"
);
