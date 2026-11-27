import { NodeFileSystem, NodePath } from "@effect/platform-node-shared";
import { expect, layer } from "@effect/vitest";
import { Array as Arr, Effect, Exit, FileSystem, Layer, Option, Path, Schema, pipe } from "effect";

import cases from "./fixtures/dawtool/cases.json" with { type: "json" };
import { readAlsDocument } from "./live-set.ts";
import type { LiveSet } from "./live-set.ts";
import { secondsAt } from "./tempo-map.test.support.ts";
import { locatorsOf, tempoEnvelopeOf, tempoPointsOf, tempoSegmentsOf } from "./tempo-map.ts";

const DIGITS = 5;

const files = Layer.mergeAll(NodeFileSystem.layer, NodePath.layer);

const TempoPointSchema = Schema.Tuple([Schema.Finite, Schema.Finite]);
const MarkerSchema = Schema.Tuple([Schema.Finite, Schema.String]);

const CaseSchema = Schema.Struct({
  name: Schema.String,
  file: Schema.String,
  theoretical: Schema.Boolean,
  unreadable: Schema.Boolean,
  tempo: Schema.NullOr(Schema.Array(TempoPointSchema)),
  markers: Schema.NullOr(Schema.Array(MarkerSchema)),
});

type Case = typeof CaseSchema.Type;

const isCases = Schema.is(Schema.Array(CaseSchema));

const typedCases: readonly Case[] = pipe(
  Option.liftPredicate(cases, isCases),
  Option.getOrElse((): readonly Case[] => []),
);

const bytesOf = Effect.fn("bytesOf")(function* bytesOf(file: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const fixture = yield* path.fromFileUrl(new URL(`fixtures/dawtool/${file}`, import.meta.url));
  return yield* fileSystem.readFile(fixture);
});

const expectTempo = (liveSet: LiveSet, tempo: Case["tempo"]): void => {
  for (const expected of Option.toArray(Option.fromNullishOr(tempo))) {
    const envelope = tempoEnvelopeOf(liveSet);
    expect(
      pipe(
        envelope,
        Arr.map((point) => point.beat),
      ),
    ).toStrictEqual(
      pipe(
        expected,
        Arr.map(([beat]) => beat),
      ),
    );
    for (const [point, [, value]] of Arr.zip(envelope, expected)) {
      expect(point.value).toBeCloseTo(value, DIGITS);
    }
  }
};

const expectMarkers = (liveSet: LiveSet, test: Case): void => {
  for (const expected of Option.toArray(Option.fromNullishOr(test.markers))) {
    const locators = locatorsOf(liveSet);
    expect(
      pipe(
        locators,
        Arr.map((locator) => locator.name),
      ),
    ).toStrictEqual(
      pipe(
        expected,
        Arr.map(([, name]) => name),
      ),
    );
    if (test.theoretical) {
      const at = secondsAt(tempoSegmentsOf(tempoPointsOf(liveSet)));
      for (const [locator, [seconds]] of Arr.zip(locators, expected)) {
        expect(at(locator.beat)).toBeCloseTo(seconds, DIGITS);
      }
    }
  }
};

layer(files)("dawtool Live Sets", (it) => {
  it("reads every case of the fixture list", () => {
    expect(isCases(cases)).toBe(true);
  });
  for (const test of pipe(
    typedCases,
    Arr.filter((each) => each.unreadable),
  )) {
    it.effect(`${test.name} rejects the file`, () =>
      Effect.gen(function* rejected() {
        const bytes = yield* bytesOf(test.file);
        const exit = yield* Effect.exit(readAlsDocument(bytes));
        expect(Exit.isFailure(exit)).toBe(true);
      }),
    );
  }
  for (const test of pipe(
    typedCases,
    Arr.filter((each) => !each.unreadable),
  )) {
    it.effect(`${test.name} reads the tempo and the markers`, () =>
      Effect.gen(function* read() {
        const bytes = yield* bytesOf(test.file);
        const document = yield* readAlsDocument(bytes);
        expectTempo(document.Ableton.LiveSet, test.tempo);
        expectMarkers(document.Ableton.LiveSet, test);
      }),
    );
  }
});
