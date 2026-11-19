import { Array as Arr, Effect, Option, Record as Rec, Schema, String as Str, pipe } from "effect";

import marketplace from "#/shared/config/masseater-marketplace.json" with { type: "json" };
import { problemInFile } from "#/shared/lib/problem.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import manifest from "#package.json" with { type: "json" };

const RULE: RuleName = "known-plugins";
const SETTINGS_FILE = ".claude/settings.json";
const GITHUB = "github";
const REPOSITORY = /github\.com\/(?<repository>[\w.-]+\/[\w.-]+?)(?:\.git)?$/u;

const Source = Schema.Struct({ source: Schema.String, repo: Schema.optionalKey(Schema.String) });
const KnownMarketplace = Schema.Struct({ source: Source });
const Marketplaces = Schema.Record(Schema.String, KnownMarketplace);
const Plugins = Schema.Record(Schema.String, Schema.Boolean);
const SettingsSchema = Schema.Struct({
  extraKnownMarketplaces: Schema.optionalKey(Marketplaces),
  enabledPlugins: Schema.optionalKey(Plugins),
});
const decodeSettings = Schema.decodeUnknownOption(Schema.fromJsonString(SettingsSchema));

type Settings = typeof SettingsSchema.Type;

const repositoryOf = (url: string): string =>
  pipe(
    Str.match(REPOSITORY)(url),
    Option.flatMapNullishOr((found) => found.groups),
    Option.flatMap(Rec.get("repository")),
    Option.getOrElse(() => url),
  );

const REPOSITORY_NAME = repositoryOf(manifest.repository.url);
const MARKETPLACE = marketplace.name;
const PLUGINS = pipe(
  marketplace.plugins,
  Arr.map(({ name }) => `${name}@${MARKETPLACE}`),
);

const problem = problemInFile(RULE);

const fromGithub = ({ source }: typeof KnownMarketplace.Type): boolean =>
  source.source === GITHUB && source.repo === REPOSITORY_NAME;

const marketplaceKnown = (settings: Settings): boolean =>
  pipe(
    Option.fromUndefinedOr(settings.extraKnownMarketplaces),
    Option.flatMap(Rec.get(MARKETPLACE)),
    Option.exists(fromGithub),
  );

const pluginEnabled =
  (settings: Settings) =>
  (plugin: string): boolean =>
    pipe(
      Option.fromUndefinedOr(settings.enabledPlugins),
      Option.flatMap(Rec.get(plugin)),
      Option.getOrElse(() => false),
    );

const marketplaceProblems = (file: string, settings: Settings): readonly Problem[] => {
  if (marketplaceKnown(settings)) {
    return [];
  }
  return [
    problem(
      file,
      `Agents miss masseater's own tools when the ${MARKETPLACE} marketplace is not known. Add "extraKnownMarketplaces": { "${MARKETPLACE}": { "source": { "source": "${GITHUB}", "repo": "${REPOSITORY_NAME}" } } }.`,
    ),
  ];
};

const pluginProblems = (file: string, settings: Settings): readonly Problem[] => {
  const enabled = pluginEnabled(settings);
  return pipe(
    PLUGINS,
    Arr.filter((plugin) => !enabled(plugin)),
    Arr.map((plugin) =>
      problem(file, `Enable "${plugin}" in "enabledPlugins" so every session gets it.`),
    ),
  );
};

/** @internal */
export const checkKnownPlugins = Effect.fn("checkKnownPlugins")(function* checkKnownPlugins(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const file = files.join(root, SETTINGS_FILE);
  const text = yield* files.readFile(file);
  const settings = pipe(
    text,
    Option.flatMap(decodeSettings),
    Option.getOrElse((): Settings => ({})),
  );
  return [...marketplaceProblems(file, settings), ...pluginProblems(file, settings)];
});
