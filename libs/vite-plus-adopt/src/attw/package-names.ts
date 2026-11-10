import { Messages, traceMessage } from "./messages.ts";
import type { ResolutionState } from "./resolution-types.ts";

interface PackageNameParts {
  readonly packageName: string;
  readonly rest: string;
}

const NOT_FOUND = -1;
const NEXT = 1;
const START = 0;
const SCOPE_SEPARATOR = "__";
const SCOPE_MARKER_LENGTH = 1;

const packageNameEnd = (moduleName: string): number => {
  const first = moduleName.indexOf("/");
  if (moduleName.startsWith("@")) {
    return moduleName.indexOf("/", first + NEXT);
  }
  return first;
};

const parsePackageName = (moduleName: string): PackageNameParts => {
  const end = packageNameEnd(moduleName);
  if (end === NOT_FOUND) {
    return { packageName: moduleName, rest: "" };
  }
  return { packageName: moduleName.slice(START, end), rest: moduleName.slice(end + NEXT) };
};

const mangleScopedPackageName = (packageName: string): string => {
  if (!packageName.startsWith("@")) {
    return packageName;
  }
  const replaced = packageName.replace("/", SCOPE_SEPARATOR);
  if (replaced === packageName) {
    return packageName;
  }
  return replaced.slice(SCOPE_MARKER_LENGTH);
};

const unmangleScopedPackageName = (typesPackageName: string): string => {
  if (!typesPackageName.includes(SCOPE_SEPARATOR)) {
    return typesPackageName;
  }
  return `@${typesPackageName.replace(SCOPE_SEPARATOR, "/")}`;
};

const getTypesPackageName = (packageName: string): string =>
  `@types/${mangleScopedPackageName(packageName)}`;

const mangleScopedPackageNameWithTrace = (packageName: string, state: ResolutionState): string => {
  const mangled = mangleScopedPackageName(packageName);
  if (mangled !== packageName) {
    traceMessage(state, Messages.scopedPackageDetected, mangled);
  }
  return mangled;
};

export {
  getTypesPackageName,
  mangleScopedPackageName,
  mangleScopedPackageNameWithTrace,
  parsePackageName,
  unmangleScopedPackageName,
};
export type { PackageNameParts };
