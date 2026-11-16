import {
  NodeChildProcessSpawner,
  NodeFileSystem,
  NodePath,
  NodeStdio,
  NodeTerminal,
} from "@effect/platform-node-shared";
import { runMain } from "@effect/platform-node-shared/NodeRuntime";
import { Effect, Layer } from "effect";

const services = Layer.provideMerge(
  NodeChildProcessSpawner.layer,
  Layer.mergeAll(NodeFileSystem.layer, NodePath.layer, NodeStdio.layer, NodeTerminal.layer),
);

/** @internal */
export const runWithNode = <Value, Failure>(
  program: Effect.Effect<Value, Failure, Layer.Success<typeof services>>,
): void => {
  runMain(
    Layer.build(services).pipe(
      Effect.flatMap((context) => Effect.provideContext(program, context)),
      Effect.scoped,
    ),
  );
};
