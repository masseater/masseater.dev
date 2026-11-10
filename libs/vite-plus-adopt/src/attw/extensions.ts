import { Array as Arr, Option, pipe, String as Str, Function as Fn } from "effect";

import { getBaseFileName } from "./paths.ts";

const DATA_FIRST_ARITY = 2;

const Extension = {
  Ts: ".ts",
  Tsx: ".tsx",
  Dts: ".d.ts",
  Js: ".js",
  Jsx: ".jsx",
  Json: ".json",
  TsBuildInfo: ".tsbuildinfo",
  Mjs: ".mjs",
  Mts: ".mts",
  Dmts: ".d.mts",
  Cjs: ".cjs",
  Cts: ".cts",
  Dcts: ".d.cts",
} as const;

type ExtensionKind = "TypeScript" | "JavaScript" | "Declaration" | "Json";

type Extensions = readonly ExtensionKind[];

const EXTENSION_KIND_ORDER: readonly ExtensionKind[] = [
  "TypeScript",
  "JavaScript",
  "Declaration",
  "Json",
];

const EXTENSION_KIND_NAMES: Readonly<Record<ExtensionKind, string>> = {
  TypeScript: "TypeScript",
  JavaScript: "JavaScript",
  Declaration: "Declaration",
  Json: "JSON",
};

const extensionsOf = (...kinds: readonly ExtensionKind[]): Extensions =>
  pipe(
    EXTENSION_KIND_ORDER,
    Arr.filter((kind) => kinds.includes(kind)),
  );

const PRIORITY_KINDS: Extensions = extensionsOf("TypeScript", "Declaration");

const intersectExtensions: {
  (right: Extensions): (left: Extensions) => Extensions;
  (left: Extensions, right: Extensions): Extensions;
} = Fn.dual(DATA_FIRST_ARITY, (left: Extensions, right: Extensions): Extensions =>
  pipe(
    left,
    Arr.filter((kind) => right.includes(kind)),
  ),
);

const subtractExtensions: {
  (right: Extensions): (left: Extensions) => Extensions;
  (left: Extensions, right: Extensions): Extensions;
} = Fn.dual(DATA_FIRST_ARITY, (left: Extensions, right: Extensions): Extensions =>
  pipe(
    left,
    Arr.filter((kind) => !right.includes(kind)),
  ),
);

const formatExtensions = (extensions: Extensions): string =>
  pipe(
    extensions,
    Arr.map((kind) => EXTENSION_KIND_NAMES[kind]),
    Arr.join(", "),
  );

const SUPPORTED_TS: readonly string[] = [
  Extension.Ts,
  Extension.Tsx,
  Extension.Dts,
  Extension.Cts,
  Extension.Dcts,
  Extension.Mts,
  Extension.Dmts,
];

const SUPPORTED_JS: readonly string[] = [Extension.Js, Extension.Jsx, Extension.Mjs, Extension.Cjs];

const SUPPORTED_DECLARATION: readonly string[] = [Extension.Dts, Extension.Dcts, Extension.Dmts];

const SUPPORTED_TS_IMPLEMENTATION: readonly string[] = [
  Extension.Ts,
  Extension.Cts,
  Extension.Mts,
  Extension.Tsx,
];

const EXTRACTABLE_TS: readonly string[] = [
  Extension.Dts,
  Extension.Dcts,
  Extension.Dmts,
  Extension.Cts,
  Extension.Mts,
  Extension.Ts,
  Extension.Tsx,
];

const REMOVABLE: readonly string[] = [
  Extension.Dts,
  Extension.Dmts,
  Extension.Dcts,
  Extension.Mjs,
  Extension.Mts,
  Extension.Cjs,
  Extension.Cts,
  Extension.Ts,
  Extension.Js,
  Extension.Tsx,
  Extension.Jsx,
  Extension.Json,
];

const ZERO = 0;

const fileExtensionIs = (path: string, extension: string): boolean =>
  path.length > extension.length && Str.endsWith(extension)(path);

const fileExtensionIsOneOf: {
  (extensions: readonly string[]): (path: string) => boolean;
  (path: string, extensions: readonly string[]): boolean;
} = Fn.dual(DATA_FIRST_ARITY, (path: string, extensions: readonly string[]): boolean =>
  pipe(
    extensions,
    Arr.some((extension) => fileExtensionIs(path, extension)),
  ),
);

const findExtension = (path: string, extensions: readonly string[]): Option.Option<string> =>
  Arr.findFirst(extensions, (extension) => fileExtensionIs(path, extension));

const hasTSFileExtension = (fileName: string): boolean =>
  fileExtensionIsOneOf(fileName, SUPPORTED_TS);

const hasJSFileExtension = (fileName: string): boolean =>
  fileExtensionIsOneOf(fileName, SUPPORTED_JS);

const ARBITRARY_DECLARATION = ".d.";

const getArbitraryDeclarationExtension = (fileName: string): Option.Option<string> =>
  Option.liftPredicate(fileName, (name) => fileExtensionIs(name, Extension.Ts)).pipe(
    Option.flatMap((name) =>
      Str.lastIndexOf(ARBITRARY_DECLARATION)(getBaseFileName(name)).pipe(
        Option.map((index) => Str.slice(name.length - getBaseFileName(name).length + index)(name)),
      ),
    ),
  );

const getDeclarationFileExtension = (fileName: string): Option.Option<string> =>
  Arr.findFirst(SUPPORTED_DECLARATION, (extension) => Str.endsWith(extension)(fileName)).pipe(
    Option.orElse(() => getArbitraryDeclarationExtension(fileName)),
  );

const isDeclarationFileName = (fileName: string): boolean =>
  Option.isSome(getDeclarationFileExtension(fileName));

const getAnyExtensionFromPath = (path: string): string => {
  const base = getBaseFileName(path);
  return Str.lastIndexOf(".")(base).pipe(
    Option.match({ onNone: () => "", onSome: (index) => Str.slice(index)(base) }),
  );
};

const removeFileExtension = (path: string): string =>
  findExtension(path, REMOVABLE).pipe(
    Option.match({
      onNone: () => path,
      onSome: (extension) => Str.slice(ZERO, path.length - extension.length)(path),
    }),
  );

const tryGetExtensionFromPath = (path: string): Option.Option<string> =>
  findExtension(path, REMOVABLE);

const tryExtractTSExtension = (fileName: string): Option.Option<string> =>
  findExtension(fileName, EXTRACTABLE_TS);

const isTSFileExtensionForPackageField: {
  (candidate: string): (extensions: Extensions) => boolean;
  (extensions: Extensions, candidate: string): boolean;
} = Fn.dual(
  DATA_FIRST_ARITY,
  (extensions: Extensions, candidate: string): boolean =>
    (extensions.includes("TypeScript") &&
      fileExtensionIsOneOf(candidate, SUPPORTED_TS_IMPLEMENTATION)) ||
    (extensions.includes("Declaration") && fileExtensionIsOneOf(candidate, SUPPORTED_DECLARATION)),
);

const EXTENSIONS_FOR_KIND: Readonly<Record<ExtensionKind, readonly string[]>> = {
  TypeScript: [Extension.Ts, Extension.Tsx, Extension.Mts, Extension.Cts],
  JavaScript: [Extension.Js, Extension.Jsx, Extension.Mjs, Extension.Cjs],
  Declaration: [Extension.Dts, Extension.Dmts, Extension.Dcts],
  Json: [Extension.Json],
};

const extensionIsOk: {
  (extension: string): (extensions: Extensions) => boolean;
  (extensions: Extensions, extension: string): boolean;
} = Fn.dual(DATA_FIRST_ARITY, (extensions: Extensions, extension: string): boolean =>
  pipe(
    EXTENSION_KIND_ORDER,
    Arr.some((kind) => extensions.includes(kind) && EXTENSIONS_FOR_KIND[kind].includes(extension)),
  ),
);

export {
  Extension,
  PRIORITY_KINDS,
  extensionIsOk,
  extensionsOf,
  fileExtensionIsOneOf,
  formatExtensions,
  getAnyExtensionFromPath,
  hasJSFileExtension,
  hasTSFileExtension,
  intersectExtensions,
  isDeclarationFileName,
  isTSFileExtensionForPackageField,
  removeFileExtension,
  subtractExtensions,
  tryExtractTSExtension,
  tryGetExtensionFromPath,
};
export type { ExtensionKind, Extensions };
