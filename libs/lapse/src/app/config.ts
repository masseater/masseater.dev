import { Option } from "effect";

const SDK = new URL("./sdk.config.ts", import.meta.url).pathname;

export const OTEL_ENV: string[] = ["OTEL_*"];

export const configOf = (endpoint: Option.Option<string>): Readonly<Record<string, unknown>> =>
  Option.match(endpoint, {
    onNone: () => ({}),
    onSome: () => ({
      test: { experimental: { openTelemetry: { enabled: true, sdkPath: SDK } } },
    }),
  });

export const withOtelEnv = <const Task extends { readonly cache?: unknown }>(
  task: Task,
): Task & Readonly<{ cache: Readonly<{ untrackedEnv: string[] }> }> => ({
  ...task,
  cache: { ...(typeof task.cache === "object" ? task.cache : {}), untrackedEnv: OTEL_ENV },
});
