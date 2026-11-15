export {
  KeySchema,
  childrenOf,
  keyName,
  literalOf,
  nestedValues,
  propertyValue,
} from "./model/config-literal.ts";
export {
  literalSettings,
  merged,
  programOf,
  settingsInvalid,
  usedFrom,
  workspaceConfigOf,
} from "./model/workspace-config-source.ts";
export type { WorkspaceSource } from "./model/workspace-config-source.ts";
export { workspaceDirectories } from "./model/workspace-directories.ts";
export { prefixed, withoutRelative } from "./model/workspace-patterns.ts";
export {
  NO_TASKS,
  RUN_TASKS,
  VERIFY_TASK,
  definesTask,
  hasVerifyTask,
  tasksOf,
} from "./model/workspace-tasks.ts";
export type { WorkspaceTasks } from "./model/workspace-tasks.ts";
export { namedWorkspaces } from "./model/workspace-names.ts";
export type { NamedWorkspace } from "./model/workspace-names.ts";
