#!/usr/bin/env node
import { CredentialsFromEnv } from "@distilled.cloud/github/Credentials";
import { CommandFailed, fail, finished, mask } from "@masseater.dev/github-workflow";
import { runMainWith } from "@masseater.dev/node-main";
import { Array as Arr, Config, Console, Effect, String as Str, pipe } from "effect";

import { installedRepositories } from "./installed-repositories.ts";

const SPECIAL = /[.[\]*^$()+?{}|\\]/gu;
const SEPARATOR = /[-_]/gu;
const SUCCESS = 0;
const NO_MATCH = 1;
const FILE_AND_LINE = 2;

const patternsOf = (name: string): readonly string[] => {
  const escaped = Str.replaceAll(SPECIAL, String.raw`\$&`)(name);
  const loose = Str.replaceAll(SEPARATOR, "[-_]?")(escaped);
  return pipe(
    [`masseater/${escaped}([^A-Za-z0-9_.-]|$)`, loose],
    Arr.filter((pattern) => pattern !== escaped),
  );
};

const hitsIn = Effect.fn("hitsIn")(function* hitsIn(
  search: Readonly<{ checkout: string; regex: string }>,
) {
  const { output, code } = yield* finished({
    command: "git",
    args: ["-C", search.checkout, "grep", "-n", "-I", "-i", "-E", search.regex],
  });
  if (code !== SUCCESS && code !== NO_MATCH) {
    return yield* CommandFailed.make({ message: `git grep failed in ${search.checkout}` });
  }
  return pipe(
    Str.split("\n")(output),
    Arr.filter(Str.isNonEmpty),
    Arr.map((line) => pipe(Str.split(":")(line), Arr.take(FILE_AND_LINE), Arr.join(":"))),
    Arr.map((hit) => `${search.checkout}/${hit}`),
  );
});

const privateRegex = Effect.gen(function* privateRegex() {
  const repositories = yield* installedRepositories;
  const names = pipe(
    repositories,
    Arr.filter((repository) => repository.private),
    Arr.map(({ name }) => name),
  );
  if (!Arr.isReadonlyArrayNonEmpty(names)) {
    return yield* fail("The GitHub App listed no private repository");
  }
  yield* Effect.forEach(names, mask, { discard: true });
  return pipe(names, Arr.flatMap(patternsOf), Arr.join("|"));
});

const privateNames = Effect.gen(function* privateNames() {
  const checkouts = yield* Config.String("CHECKOUTS");
  const regex = yield* privateRegex;
  const hits = yield* Effect.forEach(Str.split(" ")(checkouts), (checkout) =>
    hitsIn({ checkout, regex }),
  ).pipe(Effect.map(Arr.flatten));
  yield* Effect.forEach(hits, (hit) => Console.log(`::error::${hit} names a private repository`), {
    discard: true,
  });
  if (Arr.isReadonlyArrayNonEmpty(hits)) {
    return yield* fail(`${Arr.length(hits)} lines name a private repository`);
  }
  return Arr.length(hits);
});

runMainWith({ serviceName: "private-names", services: CredentialsFromEnv })(privateNames);
