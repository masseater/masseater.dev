import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";

const BACH_COMMIT = "a95574f9e93b4d72a96cd390a059df4f8471ddb6";
const BACH_BASE = `https://raw.githubusercontent.com/craigsapp/bach-370-chorales/${BACH_COMMIT}/kern`;
const BACH_NUMBERS = 371;
const DIGITS = 3;
const FIRST = 1;
const NOT_FOUND = 404;
const PARALLEL = 16;

export const BACH_SOURCE = `https://github.com/craigsapp/bach-370-chorales/tree/${BACH_COMMIT}`;

export interface Score {
  readonly name: string;
  readonly kern: string;
}

const nameOf = (number: number): string => `chor${Str.padStart(DIGITS, "0")(String(number))}`;

const fetchScore = Effect.fn("fetchScore")(function* fetchScore(name: string) {
  const client = yield* HttpClient.HttpClient;
  const response = yield* client.get(`${BACH_BASE}/${name}.krn`);
  if (response.status === NOT_FOUND) {
    return Option.none<Score>();
  }
  const ok = yield* HttpClientResponse.filterStatusOk(response);
  const kern = yield* ok.text;
  return Option.some({ name, kern });
});

/** @internal */
export const bachChorales = Effect.fn("bachChorales")(function* bachChorales() {
  const names = pipe(Arr.range(FIRST, BACH_NUMBERS), Arr.map(nameOf));
  const scores = yield* Effect.forEach(names, fetchScore, { concurrency: PARALLEL });
  return Arr.getSomes(scores);
});
