import { readableReport } from "italia-ts-commons/lib/reporters";
import {
  DisjoitedNotificationHubPartitionArray,
  NotificationHubPartition,
  RegExpFromString
} from "../types";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("nhDisjoitedFirstCharacterPartitionReadonlyArray", () => {
  const aRegex = /^[01234567]/;
  const aComplementaryRegex = /^[89a-z]/;
  const anOverlappingRegex = /^[0-9a-z]/;
  const aGapedRegex = /^[0-9a-z]/;

  const [
    // just a partition
    aPartition,
    // a partition which is complementary to aPartition
    aComplementaryPartition,
    // a partition which overlaps with aPartition
    anOverlappingPartition,
    // a partition which leaves gaps when used with aPartition
    aGapedPartition
  ] = [aRegex, aComplementaryRegex, anOverlappingRegex, aGapedRegex].map(
    (partitionRegex, i) =>
      NotificationHubPartition.decode({
        name: `partition${i}`,
        namespace: `ns${i}`,
        partitionRegex,
        sharedAccessKey: "shared"
      }).getOrElseL(e =>
        fail(
          `Cannot decode NotificationHubPartitions, i: ${i} error: ${readableReport(
            e
          )}`
        )
      )
  );

  it("should accept complementary partitions", () => {
    const result = DisjoitedNotificationHubPartitionArray.decode([
      aPartition,
      aComplementaryPartition
    ]);

    expect(result.isRight()).toBe(true);
  });

  it("should not accept overlapping partitions", () => {
    const result = DisjoitedNotificationHubPartitionArray.decode([
      aPartition,
      anOverlappingPartition
    ]);

    expect(result.isRight()).toBe(false);
  });

  it("should not accept gaped partitions", () => {
    const result = DisjoitedNotificationHubPartitionArray.decode([
      aPartition,
      aGapedPartition
    ]);

    expect(result.isRight()).toBe(false);
  });
});

describe("RegExpFromString", () => {
  it.each`
    title                  | input        | expected          | goodExample | badExample
    ${"a string prefix"}   | ${"^foo"}    | ${/^foo/}         | ${"foo"}    | ${"afoo"}
    ${"a string"}          | ${"foo"}     | ${/foo/}          | ${"afoos"}  | ${"bar"}
    ${"an escaped string"} | ${"^fo\\so"} | ${/^fo\so/}       | ${"fo o"}   | ${"foo"}
    ${"an empty string"}   | ${""}        | ${new RegExp("")} | ${""}       | ${undefined}
    ${"a regex"}           | ${/^foo/}    | ${/^foo/}         | ${"foo"}    | ${"afoo"}
  `(
    "should decode $title into a regex",
    ({ input, expected, goodExample, badExample }) => {
      const result = RegExpFromString.decode(input).getOrElseL(e =>
        fail(`Cannot decode ${input}, err: ${readableReport(e)}`)
      );

      expect(result).toEqual(expected);
      expect(result instanceof RegExp).toBe(true);

      // testing the regex performs well on a good example
      expect(result.test(goodExample)).toBe(true);
      // testing the regex performs well on a bad example
      //   undefined means "don't test"
      typeof badExample !== "undefined" &&
        expect(result.test(badExample)).toBe(false);
    }
  );

  it.each`
    title                  | input             | expected
    ${"a string"}          | ${"any string"}   | ${"any string"}
    ${"an escaped string"} | ${"any \\string"} | ${"any \\string"}
    ${"a regex"}           | ${/^foo/}         | ${"^foo"}
  `("should encode $title into a string", ({ input, expected }) => {
    const result = RegExpFromString.encode(input);

    expect(result).toEqual(expected);
    expect(typeof result === "string").toBe(true);
  });

  it.each`
    title         | input
    ${"a string"} | ${"foo"}
    ${"a regex"}  | ${/^foo/}
  `("should decode and encode $title idempotently", ({ input }) => {
    const decoded = RegExpFromString.decode(input).getOrElseL(e =>
      fail(`Cannot decode RegExpFromString, error: ${readableReport(e)}`)
    );
    const encoded = RegExpFromString.encode(decoded);
    const decodedAgain = RegExpFromString.decode(input).getOrElseL(e =>
      fail(`Cannot decode RegExpFromString, error: ${readableReport(e)}`)
    );
    const encodedAgain = RegExpFromString.encode(decoded);

    expect(decoded).toEqual(decodedAgain);
    expect(encoded).toEqual(encodedAgain);
  });
});
