import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Array as Arr, Effect, FileSystem, Layer, Schema, pipe } from "effect";
import type { PlatformError } from "effect/PlatformError";

import { createEngine } from "./engine.gen.js";
import type { Engine } from "./engine.gen.js";

const BLOCK = 128;
const CHANNELS = 2;
const RIGHT = 1;
const SILENCE = 0;
const STEP = 1;
const SCENARIOS = "scenarios.json";
const OUTPUT_DIR = "reference";

const Event = Schema.StructWithRest(Schema.Struct({ at: Schema.Finite, type: Schema.String }), [
  Schema.Record(Schema.String, Schema.Unknown),
]);

const ScenarioSchema = Schema.Struct({
  name: Schema.String,
  sampleRate: Schema.Finite,
  seconds: Schema.Finite,
  params: Schema.Record(Schema.String, Schema.Finite),
  auto: Schema.Record(Schema.String, Schema.Unknown),
  events: Schema.Array(Event),
});

type Scenario = typeof ScenarioSchema.Type;

const decodeScenarios = Schema.decodeUnknownEffect(
  Schema.fromJsonString(Schema.Array(ScenarioSchema)),
);

type Scheduled = Readonly<{ event: Scenario["events"][number]; sample: number }>;

type Block = Readonly<{
  out: Float64Array;
  left: Float64Array;
  right: Float64Array;
  pos: number;
  length: number;
}>;

const interleave = ({ out, left, right, pos, length }: Block): void => {
  for (let index = 0; index < length; index += STEP) {
    out[(pos + index) * CHANNELS] = left[index] ?? SILENCE;
    out[(pos + index) * CHANNELS + RIGHT] = right[index] ?? SILENCE;
  }
};

const scheduleOf = (scenario: Scenario): readonly Scheduled[] =>
  pipe(
    scenario.events,
    Arr.map((event) => ({ event, sample: Math.round(event.at * scenario.sampleRate) })),
  );

const dispatch = (engine: Engine, schedule: readonly Scheduled[], pos: number): void => {
  for (const { event, sample } of schedule) {
    if (sample >= pos && sample < pos + BLOCK) {
      engine.msg(event);
    }
  }
};

const render = (scenario: Scenario): Float64Array => {
  const engine = createEngine(scenario.sampleRate, {
    audio: true,
    params: scenario.params,
    auto: scenario.auto,
  });
  const total = Math.round(scenario.sampleRate * scenario.seconds);
  const block = {
    out: new Float64Array(total * CHANNELS),
    left: new Float64Array(BLOCK),
    right: new Float64Array(BLOCK),
  };
  const schedule = scheduleOf(scenario);
  for (let pos = 0; pos < total; pos += BLOCK) {
    dispatch(engine, schedule, pos);
    const length = Math.min(BLOCK, total - pos);
    engine.run(block.left, block.right, length);
    interleave({ ...block, pos, length });
  }
  return block.out;
};

const write =
  (fileSystem: FileSystem.FileSystem) =>
  (scenario: Scenario): Effect.Effect<void, PlatformError> =>
    fileSystem.writeFile(
      `${OUTPUT_DIR}/${scenario.name}.f64`,
      new Uint8Array(render(scenario).buffer),
    );

const program = Effect.gen(function* renderReference() {
  const fileSystem = yield* FileSystem.FileSystem;
  const text = yield* fileSystem.readFileString(SCENARIOS);
  const scenarios = yield* decodeScenarios(text);
  yield* fileSystem.makeDirectory(OUTPUT_DIR, { recursive: true });
  yield* Effect.forEach(scenarios, write(fileSystem), { discard: true });
});

NodeRuntime.runMain(
  Layer.build(NodeServices.layer).pipe(
    Effect.flatMap((context) =>
      Effect.provideContext(program.pipe(Effect.withSpan("pod-rattle-parity.render")), context),
    ),
    Effect.scoped,
  ),
);
