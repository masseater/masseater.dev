import { buildAddon } from "@r_masseater/lint-host";

buildAddon({
  crate: "fu4-node",
  binary: "fu4",
  packageDir: `${import.meta.dirname}/..`,
  workspaceDir: `${import.meta.dirname}/../../..`,
});
