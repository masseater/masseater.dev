import type { Project } from "@r_masseater/fu4";
import { Option } from "effect";

export interface ProjectCache<Value> {
  readonly get: (project: Project) => (key: string) => Option.Option<Value>;
  readonly set: (project: Project) => (key: string, value: Value) => void;
}

export const projectCache = <Value>(): ProjectCache<Value> => {
  const cache = new WeakMap<Project, Map<string, Value>>();
  const entriesOf = (project: Project): Map<string, Value> => {
    const found = Option.fromNullishOr(cache.get(project));
    if (Option.isSome(found)) {
      return found.value;
    }
    const created = new Map<string, Value>();
    cache.set(project, created);
    return created;
  };
  return {
    get: (project) => (key) => Option.fromNullishOr(entriesOf(project).get(key)),
    set: (project) => (key, value) => {
      entriesOf(project).set(key, value);
    },
  };
};
