import { Effect, Option, Schema, pipe } from "effect";

import type { Manifest } from "#/entities/package/index.ts";
import { literalSettings } from "#/entities/workspace/index.ts";
import type { WorkspaceSource } from "#/entities/workspace/index.ts";

const TEST_ISOLATION = ["test", "isolate"] as const;

export interface SharedTestProject {
  readonly extends: string | false;
  readonly root: string;
  readonly test: { readonly name: string; readonly isolate: false };
}

export type TestProject = string | SharedTestProject;

export interface ProjectPlace {
  readonly directory: string;
  readonly config: string | false;
}

export const sharedTestProject =
  (manifest: Option.Option<Manifest>) =>
  ({ directory, config }: ProjectPlace): TestProject => ({
    extends: config,
    root: directory,
    test: {
      name: pipe(
        manifest,
        Option.flatMap(({ name }) => Option.fromUndefinedOr(name)),
        Option.getOrElse(() => directory),
      ),
      isolate: false,
    },
  });

export const testProjectOf = Effect.fn("testProjectOf")(function* testProjectOf(
  source: WorkspaceSource,
  config: string,
  manifest: Option.Option<Manifest>,
) {
  const isolated = yield* literalSettings({
    source,
    path: TEST_ISOLATION,
    decode: Schema.decodeUnknownEffect(Schema.Boolean),
  });
  if (Option.getOrElse(isolated, () => false)) {
    return source.directory;
  }
  return sharedTestProject(manifest)({ directory: source.directory, config });
});
