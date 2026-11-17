import { buildAddon } from "@masseater.dev/lint-host";

buildAddon({
  crate: "wism-node",
  binary: "wism",
  packageDir: `${import.meta.dirname}/..`,
  workspaceDir: `${import.meta.dirname}/../../..`,
});
