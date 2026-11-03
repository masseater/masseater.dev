import { Array as Arr, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { cascadeLinks, clicked, linkDirection, replayed, started, stopDelays } from "./cascade";

test("再生すると段階の順に、根から下流へ遅れて止まる", () => {
  expect(stopDelays({ status: "playing", round: 1 })).toMatchObject({
    allnet: 0,
    arcade: 600,
    asahi: 1400,
    kirin: 2000,
    hospital: 5400,
  });
});

test("押したところから下流だけが止まる", () => {
  const state = clicked("windows")({ status: "running" });
  expect(state).toStrictEqual({ status: "stopped", origin: "windows", round: 1 });
  expect(stopDelays(state)).toStrictEqual({ windows: 0, hospital: 600 });
});

test("止まっているところを押すと全部動き出す", () => {
  expect(clicked("kirin")({ status: "playing", round: 2 })).toStrictEqual({ status: "running" });
});

test("もう一度再生すると回が進む", () => {
  expect(replayed({ status: "stopped", origin: "asahi", round: 3 })).toStrictEqual({
    status: "playing",
    round: 4,
  });
});

test("見えたときの再生は、まだ動いているときだけ始まる", () => {
  expect(started({ status: "running" })).toStrictEqual({ status: "playing", round: 1 });
  const stopped = { status: "stopped", origin: "asahi", round: 2 } as const;
  expect(started(stopped)).toBe(stopped);
});

test("辺の向きは、同じ列なら下、同じ行なら横、それ以外は下から横へ", () => {
  expect(
    pipe(
      cascadeLinks,
      Arr.map((link) => `${link.source}:${linkDirection(link)}`),
    ),
  ).toStrictEqual([
    "allnet:across",
    "nichirei:across",
    "askul:across",
    "asahi:across",
    "asahi:down-across",
    "crowdstrike:across",
    "windows:down",
    "cloud:across",
  ]);
});
