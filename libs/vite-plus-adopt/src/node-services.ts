import { layer as childProcessSpawner } from "@effect/platform-node-shared/NodeChildProcessSpawner";
import { layer as fileSystem } from "@effect/platform-node-shared/NodeFileSystem";
import { layer as path } from "@effect/platform-node-shared/NodePath";
import { layer as stdio } from "@effect/platform-node-shared/NodeStdio";
import { layer as terminal } from "@effect/platform-node-shared/NodeTerminal";
import { Layer } from "effect";

const nodeServicesLayer = Layer.provideMerge(
  childProcessSpawner,
  Layer.mergeAll(fileSystem, path, stdio, terminal),
);

/** @internal */
export { nodeServicesLayer };
