import { Array, Cause, Duration, Effect, Exit, Fiber, pipe } from "effect";

import { loadModel } from "#/features/render-models/model/load-model";
import { renderViews } from "#/features/render-models/model/render-views";
import { failRender, listRenderJobs, putRender, readModel } from "#/shared/api";

const BUSY = Duration.fromInputUnsafe("1 second");
const IDLE = Duration.fromInputUnsafe("10 seconds");

interface Job {
  readonly assetId: number;
  readonly pathname: string;
}

const rendered = Effect.fn("rendered")(function* renderJob({ assetId, pathname }: Job) {
  const { model, files } = yield* Effect.promise(() => readModel(assetId));
  const object = yield* loadModel({ pathname, model, files });
  return yield* renderViews(object);
}, Effect.scoped);

const renderOne = Effect.fn("renderOne")(function* renderOne(job: Job) {
  const exit = yield* Effect.exit(rendered(job));
  if (Exit.isSuccess(exit)) {
    const pngs = exit.value;
    return yield* Effect.promise(() => putRender({ assetId: job.assetId, pngs }));
  }
  const reason = Cause.pretty(exit.cause);
  yield* Effect.logWarning("render failed", job.pathname, reason);
  return yield* Effect.promise(() => failRender({ assetId: job.assetId, reason }));
});

const renderPending = Effect.gen(function* renderPending() {
  const jobs = yield* Effect.promise(listRenderJobs);
  yield* pipe(jobs, Effect.forEach(renderOne));
  return Array.match(jobs, { onEmpty: () => IDLE, onNonEmpty: () => BUSY });
}).pipe(Effect.catchCause(() => Effect.succeed(IDLE)));

const renderLoop = renderPending.pipe(Effect.flatMap(Effect.sleep), Effect.forever);

const startRendering = (): (() => void) => {
  const fiber = Effect.runFork(renderLoop);
  return (): void => {
    Effect.runFork(Fiber.interrupt(fiber));
  };
};

export { startRendering };
