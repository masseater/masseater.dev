import { Array as Arr, Option, String as Str, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { contentSecurityPolicy } from "./content-security-policy.ts";

const directive = (policy: string, name: string): readonly string[] =>
  pipe(
    Str.split(policy, "; "),
    Arr.findFirst(Str.startsWith(`${name} `)),
    Option.map(Str.split(" ")),
    Option.getOrElse((): readonly string[] => []),
  );

const jsdelivr = (sources: readonly string[]): readonly string[] =>
  pipe(sources, Arr.filter(Str.includes("cdn.jsdelivr.net")));

const policy = contentSecurityPolicy({ scriptHashes: [], clientCompute: true });

test("scripts load only from the pinned tesseract.js worker and core paths", () => {
  expect(jsdelivr(directive(policy, "script-src"))).toStrictEqual([
    "https://cdn.jsdelivr.net/npm/tesseract.js@v7.0.0/dist/",
    "https://cdn.jsdelivr.net/npm/tesseract.js-core@v7.0.0/",
  ]);
});

test("fetches reach only the tesseract.js language data", () => {
  expect(jsdelivr(directive(policy, "connect-src"))).toStrictEqual([
    "https://cdn.jsdelivr.net/npm/@tesseract.js-data/",
  ]);
});

test("a site without client compute allows nothing from the CDN", () => {
  expect(contentSecurityPolicy({ scriptHashes: [], clientCompute: false })).not.toContain(
    "cdn.jsdelivr.net",
  );
});
