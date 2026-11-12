import {
  NodeChildProcessSpawner,
  NodeFileSystem,
  NodePath,
  NodeStdio,
} from "@effect/platform-node-shared";
import { Layer } from "effect";

const nodeServicesLayer = Layer.provideMerge(
  NodeChildProcessSpawner.layer,
  Layer.mergeAll(NodeFileSystem.layer, NodePath.layer, NodeStdio.layer),
);

/** @internal */
export { nodeServicesLayer };
