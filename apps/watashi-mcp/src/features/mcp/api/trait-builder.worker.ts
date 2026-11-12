import { createModels } from "@earendil-works/pi-ai/models";
import { Harness, createRegistry } from "@earendil-works/pi-durable";
import type { Registry } from "@earendil-works/pi-durable";
import { runner } from "@r_masseater/workers-tracing/effect";
import { PiHarness } from "agents/harness/pi";
import { Lifecycle } from "agents/lifecycle";
import { createAI } from "agents/models/pi-ai";
import { DurableObject, env } from "cloudflare:workers";
import { Effect, Logger, Option, Semaphore } from "effect";

import { TRAIT_MODEL, traitExtension } from "./trait-pi";
import { buildTraits } from "./trait-run.server";
import type { Conversation, RunSummary } from "./trait-run.server";

const MAX_TURNS = 3;

const ONE_RUN = 1;

const BUSY = "busy";

type RunResult = RunSummary | typeof BUSY;

const busy = (): RunResult => BUSY;

const logRun = (summary: RunResult): Effect.Effect<void> =>
  Effect.logInfo("watashi.traits.run").pipe(Effect.annotateLogs({ summary }));

const traitRegistry = (): Registry => {
  const registry = createRegistry();
  registry.install(traitExtension());
  return registry;
};

const logger = Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]);
const runLogged = runner(logger);

class TraitBuilder extends DurableObject {
  private readonly ai = createAI({ binding: env.AI });

  private readonly registry = traitRegistry();

  private readonly harness = new PiHarness({
    harness: ({ storage, context, onWake }): Promise<Harness> => {
      const models = createModels();
      models.setProvider(this.ai.provider);
      return Harness.open(storage, { models, registry: this.registry, onWake }, context);
    },
    defaults: { model: this.ai(TRAIT_MODEL), thinkingLevel: "low", maxTurns: MAX_TURNS },
  });

  private readonly gate = Semaphore.makeUnsafe(ONE_RUN);

  public readonly lifecycle = Lifecycle.install(this).use(this.harness);

  public run(): Promise<RunResult> {
    const session = this.harness.session();
    const conversation: Conversation = {
      reset: () => session.reset(),
      prompt: (input) => session.prompt(input),
    };
    const guarded = buildTraits({ conversation, translator: env.TRANSLATOR }).pipe(
      this.gate.withPermitsIfAvailable(ONE_RUN),
      Effect.map(Option.getOrElse(busy)),
      Effect.tap(logRun),
    );
    return runLogged(guarded);
  }
}

const builder = (): DurableObjectStub<TraitBuilder> => env.TRAIT_BUILDER.getByName("owner");

const worker = {
  scheduled: (): Promise<RunResult> => builder().run(),
};

export { TraitBuilder };
export default worker;
export type { RunResult };
