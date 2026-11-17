import type { UserConfig } from "vite-plus";

export type Tasks = NonNullable<NonNullable<UserConfig["run"]>["tasks"]>;

export type CacheInput = string | { readonly pattern: string; readonly base: "workspace" };

export interface AddonBuildTask {
  readonly command: string;
  readonly inputs: readonly CacheInput[];
  readonly untrackedEnv?: readonly string[];
}

export const addonTasks = ({ command, inputs, untrackedEnv = [] }: AddonBuildTask): Tasks => ({
  native: {
    command,
    cache: {
      input: [...inputs, "package.json"],
      output: ["native/*.node"],
      untrackedEnv: [...untrackedEnv],
    },
  },
  build: { command: "vp pack", dependsOn: ["native", { task: "build", from: "dependencies" }] },
  test: { command: "vp test run", dependsOn: ["native"] },
});
