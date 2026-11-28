import { Option, Schema } from "effect";

const Build = Schema.Struct({
  beforeDevCommand: Schema.optional(Schema.String),
  devUrl: Schema.optional(Schema.String),
});

const TauriConfig = Schema.Struct({ build: Schema.optional(Build) });

export const TauriConfigJson = Schema.fromJsonString(TauriConfig);

export type DevServer = Readonly<{ command: string; url: string }>;

export type DesktopApp = Readonly<{ name: string; dir: string; command: string; url: string }>;

const devServerOfBuild = (build: typeof Build.Type): Option.Option<DevServer> =>
  Option.all({
    command: Option.fromNullishOr(build.beforeDevCommand),
    url: Option.fromNullishOr(build.devUrl),
  });

export const devServerOf = (config: typeof TauriConfig.Type): Option.Option<DevServer> =>
  Option.flatMap(Option.fromNullishOr(config.build), devServerOfBuild);
