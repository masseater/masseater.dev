import { Array as Arr } from "effect";
import type { RuleTester } from "vite-plus/lint/plugins-dev";

const identity = ({
  code,
  filename,
  options,
  settings,
  languageOptions,
}: RuleTester.ValidTestCase): string =>
  JSON.stringify({ code, filename, options, settings, languageOptions });

const distinct = <Case extends RuleTester.ValidTestCase>(cases: readonly Case[]): Case[] =>
  Arr.dedupeWith(cases, (left, right) => identity(left) === identity(right));

export { distinct };
