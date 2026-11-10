import { Option, String as Str } from "effect";

import { normalizePath } from "./paths.ts";
import { indexFrom } from "./text-search.ts";

const START = 0;
const SEPARATOR_STEP = 1;
const NODE_MODULES_PART = "/node_modules/";

const nextSeparator = (path: string, previous: number): number =>
  Option.getOrElse(indexFrom(path, "/", previous + SEPARATOR_STEP), () => previous);

const packageDirectoryEnd = (path: string, nodeModulesIndex: number): number => {
  const afterNodeModules = nodeModulesIndex + NODE_MODULES_PART.length;
  const afterName = nextSeparator(path, afterNodeModules);
  if (path[afterNodeModules] === "@") {
    return nextSeparator(path, afterName);
  }
  return afterName;
};

const parseNodeModuleFromPath = (resolved: string): Option.Option<string> => {
  const path = normalizePath(resolved);
  return Option.map(Str.lastIndexOf(NODE_MODULES_PART)(path), (index) =>
    Str.slice(START, packageDirectoryEnd(path, index))(path),
  );
};

const pathContainsNodeModules = (path: string): boolean => Str.includes(NODE_MODULES_PART)(path);

export { parseNodeModuleFromPath, pathContainsNodeModules };
