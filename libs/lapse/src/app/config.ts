import { Option } from "effect";

const SDK = new URL("./sdk.config.ts", import.meta.url).pathname;

export const configOf = (endpoint: Option.Option<string>): Readonly<Record<string, unknown>> =>
  Option.match(endpoint, {
    onNone: () => ({}),
    onSome: () => ({
      test: { experimental: { openTelemetry: { enabled: true, sdkPath: SDK } } },
    }),
  });
