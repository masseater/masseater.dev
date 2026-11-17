import { Array as Arr, Option, Record as Rec, String as Str, pipe } from "effect";

const LIBC: Readonly<Record<string, string>> = { gnu: "glibc", musl: "musl" };
const CPU_INDEX = 1;
const ABI_INDEX = 2;

export interface Platform {
  readonly name: string;
  readonly version: string;
  readonly binary: string;
  readonly target: string;
}

const libcOf = (parts: readonly string[]): Readonly<Record<string, readonly string[]>> =>
  pipe(
    Arr.get(parts, ABI_INDEX),
    Option.flatMap((abi) => Rec.get(LIBC, abi)),
    Option.match({ onNone: () => ({}), onSome: (libc) => ({ libc: [libc] }) }),
  );

export const platformFields = ({
  name,
  version,
  binary,
  target,
}: Platform): Readonly<Record<string, unknown>> => {
  const parts = Str.split(target, "-");
  const file = `${binary}.${target}.node`;
  return {
    name: `${name}-${target}`,
    version,
    os: [Arr.headNonEmpty(parts)],
    cpu: Option.toArray(Arr.get(parts, CPU_INDEX)),
    ...libcOf(parts),
    main: file,
    files: [file],
  };
};

export const platformReadme = ({ name, target }: Platform): string =>
  `# ${name}-${target}\n\nThe prebuilt ${target} native addon of [${name}](https://www.npmjs.com/package/${name}). Install ${name} instead; npm picks this package for your platform.\n`;
