import { Option, String as Str, Function as Fn } from "effect";

import { Messages, traceMessage } from "./messages.ts";
import type { ResolutionState } from "./resolution-types.ts";
import { indexFrom } from "./text-search.ts";

const DATA_FIRST_ARITY = 2;

export interface PackageNameParts {
  readonly packageName: string;
  readonly rest: string;
}

const NEXT = 1;
const START = 0;
const SCOPE_SEPARATOR = "__";
const SCOPE_MARKER_LENGTH = 1;

const packageNameEnd = (moduleName: string): Option.Option<number> => {
  const first = Str.indexOf("/")(moduleName);
  if (Str.startsWith("@")(moduleName)) {
    return first.pipe(Option.flatMap((index) => indexFrom(moduleName, "/", index + NEXT)));
  }
  return first;
};

export const parsePackageName = (moduleName: string): PackageNameParts =>
  Option.match(packageNameEnd(moduleName), {
    onNone: () => ({ packageName: moduleName, rest: "" }),
    onSome: (end) => ({
      packageName: Str.slice(START, end)(moduleName),
      rest: Str.slice(end + NEXT)(moduleName),
    }),
  });

export const mangleScopedPackageName = (packageName: string): string => {
  if (!Str.startsWith("@")(packageName)) {
    return packageName;
  }
  const replaced = Str.replace("/", SCOPE_SEPARATOR)(packageName);
  if (replaced === packageName) {
    return packageName;
  }
  return Str.slice(SCOPE_MARKER_LENGTH)(replaced);
};

export const unmangleScopedPackageName = (typesPackageName: string): string => {
  if (!Str.includes(SCOPE_SEPARATOR)(typesPackageName)) {
    return typesPackageName;
  }
  return `@${Str.replace(SCOPE_SEPARATOR, "/")(typesPackageName)}`;
};

export const getTypesPackageName = (packageName: string): string =>
  `@types/${mangleScopedPackageName(packageName)}`;

export const mangleScopedPackageNameWithTrace: {
  (state: ResolutionState): (packageName: string) => string;
  (packageName: string, state: ResolutionState): string;
} = Fn.dual(DATA_FIRST_ARITY, (packageName: string, state: ResolutionState): string => {
  const mangled = mangleScopedPackageName(packageName);
  if (mangled !== packageName) {
    traceMessage(state, Messages.scopedPackageDetected, mangled);
  }
  return mangled;
});
