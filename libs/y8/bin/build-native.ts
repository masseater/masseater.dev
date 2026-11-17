import { buildAddon } from "@masseater.dev/lint-host";

buildAddon({
  crate: "y8-node",
  binary: "y8",
  packageDir: `${import.meta.dirname}/..`,
  workspaceDir: `${import.meta.dirname}/../../..`,
});
