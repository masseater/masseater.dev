import { Config, Effect } from "effect";

/** @internal */
export interface Platform {
  readonly key: string;
  readonly tar: string;
  readonly libraries: readonly string[];
  readonly extension: string;
  readonly delimiter: string;
  readonly windows: boolean;
}

const LINUX: Platform = {
  key: "linux-x86_64",
  tar: "tar",
  libraries: ["lib"],
  extension: ".so",
  delimiter: ":",
  windows: false,
};

const windows = Effect.gen(function* windowsPlatform() {
  const systemRoot = yield* Config.String("SystemRoot").pipe(
    Config.withDefault(String.raw`C:\Windows`),
  );
  return {
    key: "windows-x86_64",
    tar: String.raw`${systemRoot}\System32\tar.exe`,
    libraries: ["bin", "bin/x64"],
    extension: ".dll",
    delimiter: ";",
    windows: true,
  } satisfies Platform;
});

/** @internal */
export const platformOf = Effect.fn("cuda.platform")(function* platformOf(os: string) {
  if (os === "win32") {
    return yield* windows;
  }
  if (os === "linux") {
    return LINUX;
  }
  return yield* Effect.die(`CUDA has no ${os} toolkit`);
});
