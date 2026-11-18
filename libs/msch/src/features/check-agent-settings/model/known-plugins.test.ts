import { layer } from "@effect/vitest";
import { Array as Arr, Effect, Record as Rec, Schema, String as Str, pipe } from "effect";
import { expect } from "vite-plus/test";

import marketplace from "#/shared/config/masseater-marketplace.json" with { type: "json" };
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkKnownPlugins } from "./known-plugins.ts";

const SETTINGS = ".claude/settings.json";
const MARKETPLACE_PROBLEMS = 1;
const encodeSettings = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

const pluginIds = pipe(
  marketplace.plugins,
  Arr.map(({ name }) => `${name}@${marketplace.name}`),
);

const messagesFor = Effect.fn("messagesFor")(function* messagesFor(settings: string) {
  const root = yield* gitRepositoryWith({ [SETTINGS]: settings });
  const problems = yield* checkKnownPlugins(root);
  return pipe(
    problems,
    Arr.map(({ rule, message }) => `${rule} ${message}`),
  );
});

const mentioned =
  (messages: readonly string[]) =>
  (plugin: string): boolean =>
    pipe(messages, Arr.some(Str.includes(plugin)));

const flagsMissingSettings = Effect.gen(function* flagsMissingSettings() {
  const messages = yield* messagesFor("{}\n");
  expect(messages).toHaveLength(MARKETPLACE_PROBLEMS + pluginIds.length);
  const allMentioned = pipe(pluginIds, Arr.every(mentioned(messages)));
  expect(allMentioned).toBe(true);
});

const passesCompleteSettings = Effect.gen(function* passesCompleteSettings() {
  const settings = yield* encodeSettings({
    extraKnownMarketplaces: {
      [marketplace.name]: { source: { source: "github", repo: "masseater/masseater.dev" } },
    },
    enabledPlugins: Rec.fromIterableWith(pluginIds, (plugin) => [plugin, true]),
  });
  const messages = yield* messagesFor(settings);
  expect(messages).toStrictEqual([]);
});

layer(fixtureLayer)("the masseater marketplace is known", (it) => {
  it.effect("flags settings without the marketplace or its plugins", () => flagsMissingSettings);
  it.effect(
    "passes settings that know the marketplace and enable every plugin",
    () => passesCompleteSettings,
  );
});
