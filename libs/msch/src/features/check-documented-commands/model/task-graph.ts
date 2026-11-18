import { Context, Effect, Option, Schema, Stream, pipe } from "effect";
import { ChildProcess } from "effect/process";

const SUCCESS = 0;

const PackageSchema = Schema.Struct({ name: Schema.optional(Schema.String) });
const TaskSchema = Schema.Struct({ package: Schema.String, name: Schema.String });

const TaskGraphSchema = Schema.Struct({
  packages: Schema.Record(Schema.String, PackageSchema),
  tasks: Schema.Record(Schema.String, TaskSchema),
});

export type TaskGraph = typeof TaskGraphSchema.Type;

const decodeGraph = Schema.decodeUnknownOption(Schema.fromJsonString(TaskGraphSchema));

/** @internal */
export const listedTasks = Effect.fn("listedTasks")(
  function* listedTasks(root: string) {
    const handle = yield* ChildProcess.make("vp", ["run", "--json"], {
      cwd: root,
      extendEnv: true,
      stdin: "ignore",
      stderr: "ignore",
    });
    const text = yield* handle.stdout.pipe(Stream.decodeText(), Stream.mkString);
    const code = yield* handle.exitCode;
    return pipe(
      Option.liftPredicate(text, () => Number(code) === SUCCESS),
      Option.flatMap(decodeGraph),
    );
  },
  Effect.scoped,
  Effect.orElseSucceed(() => Option.none<TaskGraph>()),
);

export const GivenTaskGraph = Context.Reference<Option.Option<TaskGraph>>("msch/GivenTaskGraph", {
  defaultValue: () => Option.none(),
});
