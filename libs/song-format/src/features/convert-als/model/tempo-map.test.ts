import { readFileSync } from "node:fs";

import { describe, expect, it } from "@effect/vitest";
import { Array as Arr, Effect, Exit } from "effect";

import cases from "./fixtures/dawtool/cases.json" with { type: "json" };
import { readAlsDocument } from "./live-set.ts";
import {
  locatorsOf,
  secondsAt,
  tempoEnvelopeOf,
  tempoPointsOf,
  tempoSegmentsOf,
} from "./tempo-map.ts";

const DIGITS = 5;

const bytesOf = (file: string): Uint8Array =>
  readFileSync(new URL(`fixtures/dawtool/${file}`, import.meta.url));

describe("dawtool Live Sets", () => {
  for (const test of cases) {
    if (test.unreadable) {
      it.effect(`${test.name} rejects the file`, () =>
        Effect.gen(function* rejected() {
          const exit = yield* Effect.exit(readAlsDocument(bytesOf(test.file)));
          expect(Exit.isFailure(exit)).toBe(true);
        }),
      );
      continue;
    }
    it.effect(`${test.name} reads the tempo and the markers`, () =>
      Effect.gen(function* read() {
        const document = yield* readAlsDocument(bytesOf(test.file));
        const envelope = tempoEnvelopeOf(document.Ableton.LiveSet);
        if (test.tempo !== null) {
          expect(Arr.map(envelope, (point) => point.beat)).toStrictEqual(
            Arr.map(test.tempo, ([beat]) => beat),
          );
          Arr.forEach(envelope, (point, index) => {
            expect(point.value).toBeCloseTo(test.tempo?.[index]?.[1] ?? Number.NaN, DIGITS);
          });
        }
        if (test.markers === null) {
          return;
        }
        const locators = locatorsOf(document.Ableton.LiveSet);
        const expected = test.markers;
        expect(Arr.map(locators, (locator) => locator.name)).toStrictEqual(
          Arr.map(expected, ([, name]) => name),
        );
        if (test.theoretical) {
          const at = secondsAt(tempoSegmentsOf(tempoPointsOf(document.Ableton.LiveSet)));
          Arr.forEach(locators, (locator, index) => {
            expect(at(locator.beat)).toBeCloseTo(Number(expected[index]?.[0]), DIGITS);
          });
        }
      }),
    );
  }
});
