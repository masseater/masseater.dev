import { Option } from "effect";

import {
  Extension,
  hasJSFileExtension,
  hasTSFileExtension,
  isDeclarationFileName,
} from "./extensions.ts";
import { getTypesPackageName, unmangleScopedPackageName } from "./package-names.ts";
import {
  combinePaths,
  comparePathsCaseInsensitive,
  ensureTrailingDirectorySeparator,
  forEachAncestorDirectory as forEachAncestor,
  pathIsRelative,
} from "./paths.ts";

const forEachAncestorDirectory = <Found>(
  directory: string,
  visit: (ancestor: string) => Found | undefined,
): Found | undefined =>
  Option.getOrUndefined(
    forEachAncestor(directory, (ancestor) => Option.fromUndefinedOr(visit(ancestor))),
  );

const pathFunctions = {
  Extension,
  combinePaths,
  comparePathsCaseInsensitive,
  ensureTrailingDirectorySeparator,
  forEachAncestorDirectory,
  getTypesPackageName,
  hasJSFileExtension,
  hasTSFileExtension,
  isDeclarationFileName,
  pathIsRelative,
  unmangleScopedPackageName,
};

export { pathFunctions };
