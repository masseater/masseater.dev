import { callAddon, traceparent } from "@r_masseater/lint-host";
import { Effect, Option, Schema } from "effect";

import { FindingSchema } from "#/shared/config/index.ts";
import type { Finding, GitSource, H56mConfig } from "#/shared/config/index.ts";
import { failedWith } from "#/shared/lib/errors.ts";
import type { H56mError } from "#/shared/lib/errors.ts";
import { native } from "#/shared/native/index.ts";
import type { NativeDetector } from "#/shared/native/index.ts";

const DEFAULT_EXTEND = { useDefault: true } as const;
const ONE_FILE = 1;
const WHOLE_REPOSITORY = 0;

const decodeFindings = Schema.decodeUnknownEffect(Schema.Array(FindingSchema));

export interface TextScan {
  readonly path: string;
  readonly text: string;
}

export interface GitScan {
  readonly root: string;
  readonly source: GitSource;
}

export interface Detector {
  readonly scanText: (scan: TextScan) => Effect.Effect<readonly Finding[], H56mError>;
  readonly scanGit: (scan: GitScan) => Effect.Effect<readonly Finding[], H56mError>;
}

type Traced<Input> = Input | (Input & { readonly traceparent: string });

const withParent = <Input extends object>(input: Input): Effect.Effect<Traced<Input>> =>
  traceparent.pipe(
    Effect.map(
      Option.match({
        onNone: (): Traced<Input> => input,
        onSome: (value): Traced<Input> => ({ ...input, traceparent: value }),
      }),
    ),
  );

interface NativeScan {
  readonly name: string;
  readonly files: number;
  readonly call: () => unknown;
}

const run = ({ name, files, call }: NativeScan): Effect.Effect<readonly Finding[], H56mError> =>
  callAddon({ addon: native, name, files, call, failWith: failedWith }).pipe(
    Effect.flatMap((found) =>
      decodeFindings(found).pipe(Effect.mapError(failedWith("h56m returned an unknown shape"))),
    ),
  );

const scannerOf = (detector: NativeDetector): Detector => ({
  scanText: (scan) =>
    withParent(scan).pipe(
      Effect.flatMap((input) =>
        run({ name: "h56m.text", files: ONE_FILE, call: () => detector.scan(input) }),
      ),
      Effect.withSpan("h56m.scan_text"),
    ),
  scanGit: (scan) =>
    withParent(scan).pipe(
      Effect.flatMap((input) =>
        run({ name: "h56m.git", files: WHOLE_REPOSITORY, call: () => detector.scanGit(input) }),
      ),
      Effect.withSpan("h56m.scan_git", { attributes: { "h56m.source": scan.source.type } }),
    ),
});

export const makeDetector = Effect.fn("h56m.detector")(function* makeDetector(
  config: H56mConfig = {},
) {
  const { ignoredSecrets = [], extend = DEFAULT_EXTEND, ...rest } = config;
  const input = yield* withParent({ config: { ...rest, extend }, ignored: ignoredSecrets });
  const detector = yield* callAddon({
    addon: native,
    name: "h56m",
    files: WHOLE_REPOSITORY,
    call: (addon) => new addon.SecretDetector(input),
    failWith: failedWith,
  });
  return scannerOf(detector);
});
