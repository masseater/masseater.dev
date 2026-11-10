import { Option } from "effect";

import { normalizePath } from "./paths.ts";

const NOT_FOUND = -1;
const START = 0;
const SEPARATOR_STEP = 1;
const NODE_MODULES_PART = "/node_modules/";

const nextSeparator = (path: string, previous: number): number => {
  const index = path.indexOf("/", previous + SEPARATOR_STEP);
  if (index === NOT_FOUND) {
    return previous;
  }
  return index;
};

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
  const index = path.lastIndexOf(NODE_MODULES_PART);
  if (index === NOT_FOUND) {
    return Option.none();
  }
  return Option.some(path.slice(START, packageDirectoryEnd(path, index)));
};

const pathContainsNodeModules = (path: string): boolean => path.includes(NODE_MODULES_PART);

export { parseNodeModuleFromPath, pathContainsNodeModules };
