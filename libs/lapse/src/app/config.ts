import { Option, Predicate } from "effect";

const SDK = new URL("./sdk.config.ts", import.meta.url).pathname;

export const OTEL_ENV: string[] = ["OTEL_*"];

export const configOf = (endpoint: Option.Option<string>): Readonly<Record<string, unknown>> =>
  Option.match(endpoint, {
    onNone: () => ({}),
    onSome: () => ({
      test: { experimental: { openTelemetry: { enabled: true, sdkPath: SDK } } },
    }),
  });

type Tasks = Readonly<Record<string, unknown>>;

const recordOr = (value: unknown): Tasks =>
  Option.getOrElse(Option.liftPredicate(value, Predicate.isObject), () => ({}));

export const withOtelEnv = <const Config extends { readonly run?: unknown }>(
  config: Config,
): Config => {
  const run = recordOr(config.run);
  const tasks = recordOr(run["tasks"]);
  const test = recordOr(tasks["test"]);
  return {
    ...config,
    run: {
      ...run,
      tasks: {
        ...tasks,
        test: { ...test, cache: { ...recordOr(test["cache"]), untrackedEnv: OTEL_ENV } },
      },
    },
  };
};
