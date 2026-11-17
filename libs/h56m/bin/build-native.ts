import { buildAddon } from "@masseater.dev/lint-host";

buildAddon({
  crate: "h56m-node",
  binary: "h56m",
  packageDir: `${import.meta.dirname}/..`,
  workspaceDir: `${import.meta.dirname}/../../..`,
});
