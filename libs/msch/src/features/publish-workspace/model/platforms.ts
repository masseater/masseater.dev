import { Array as Arr, Boolean as Bool, Option, Record as Rec, String as Str, pipe } from "effect";

const RUNNERS = {
  linux: "ubuntu-latest",
  windows: "windows-latest",
  macos: "macos-latest",
} as const satisfies Readonly<Record<string, string>>;

type Os = keyof typeof RUNNERS;

const NODE_PLATFORMS: Readonly<Record<string, Os>> = {
  linux: "linux",
  win32: "windows",
  darwin: "macos",
};

const BUILD = "release:";
const CHECK = "release:check:";
const LIBC: Readonly<Record<string, string>> = { gnu: "glibc", musl: "musl" };
const CPU_INDEX = 1;
const ABI_INDEX = 2;

/** @internal */
export interface Runner {
  readonly os: string;
  readonly runner: string;
}

/** @internal */
export interface NativeTarget {
  readonly target: string;
  readonly runner: string;
}

const systems = Rec.keys(RUNNERS);

const runnersFor = (tasks: readonly string[], prefix: string): readonly Runner[] =>
  pipe(
    systems,
    Arr.filter((os) => Arr.contains(tasks, `${prefix}${os}`)),
    Arr.map((os): Runner => ({ os, runner: RUNNERS[os] })),
  );

/** @internal */
export const buildsOf = (tasks: readonly string[]): readonly Runner[] => runnersFor(tasks, BUILD);

/** @internal */
export const checksOf = (tasks: readonly string[]): readonly Runner[] => runnersFor(tasks, CHECK);

/** @internal */
export const nativeTargetsOf = (targets: readonly string[]): readonly NativeTarget[] =>
  pipe(
    targets,
    Arr.flatMap((target) =>
      pipe(
        Arr.head(Str.split(target, "-")),
        Option.flatMap((platform) => Rec.get(NODE_PLATFORMS, platform)),
        Option.map((os): NativeTarget => ({ target, runner: RUNNERS[os] })),
        Option.toArray,
      ),
    ),
  );

/** @internal */
export interface NativePackage {
  readonly name: string;
  readonly version: string;
  readonly binary: string;
  readonly target: string;
  readonly archive: boolean;
}

const libcOf = (parts: readonly string[]): Readonly<Record<string, readonly string[]>> =>
  pipe(
    Arr.get(parts, ABI_INDEX),
    Option.flatMap((abi) => Rec.get(LIBC, abi)),
    Option.match({ onNone: () => ({}), onSome: (libc) => ({ libc: [libc] }) }),
  );

/** @internal */
export const nativeFileOf = ({ binary, target, archive }: NativePackage): string =>
  `${binary}.${target}.${Bool.match(archive, { onFalse: () => "node", onTrue: () => "tgz" })}`;

/** @internal */
export const nativeFields = (native: NativePackage): Readonly<Record<string, unknown>> => {
  const parts = Str.split(native.target, "-");
  const file = nativeFileOf(native);
  return {
    name: `${native.name}-${native.target}`,
    version: native.version,
    os: Option.toArray(Arr.head(parts)),
    cpu: Option.toArray(Arr.get(parts, CPU_INDEX)),
    ...libcOf(parts),
    ...Bool.match(native.archive, {
      onFalse: (): Readonly<Record<string, unknown>> => ({ main: file, files: [file] }),
      onTrue: (): Readonly<Record<string, unknown>> => ({ preferUnplugged: true }),
    }),
  };
};

/** @internal */
export const nativeReadme = ({ name, target, archive }: NativePackage): string =>
  `# ${name}-${target}\n\nThe prebuilt ${target} ${Bool.match(archive, { onFalse: () => "native addon", onTrue: () => "build" })} of [${name}](https://www.npmjs.com/package/${name}). Install ${name} instead; npm picks this package for your platform.\n`;
