import { Effect, Predicate } from "effect";

import { flushTraces, runtime } from "#/shared/lib/telemetry";

type Releasable = Pick<GPUDevice, "destroy">;

const NONE = 0;
const ONE = 1;

const live = { devices: NONE, watching: false };

const tracked = new WeakSet<Releasable>();

const persistedOf = (event: unknown): boolean =>
  Predicate.hasProperty(event, "persisted") && event.persisted === true;

const reportHide = (persisted: boolean): void => {
  runtime.runFork(
    Effect.void.pipe(
      Effect.withSpan("mosaic.page.hide", {
        attributes: {
          "mosaic.gpu.live_devices": live.devices,
          "mosaic.page.persisted": persisted,
        },
      }),
      Effect.andThen(flushTraces),
    ),
  );
};

const watchPageHide = (): void => {
  if (live.watching) {
    return;
  }
  live.watching = true;
  globalThis.addEventListener("pagehide", (event) => {
    reportHide(persistedOf(event));
  });
};

const lifetime = (device: GPUDevice): Effect.Effect<void> =>
  Effect.promise(() => device.lost).pipe(
    Effect.flatMap(({ reason }) => Effect.annotateCurrentSpan("mosaic.gpu.lost_reason", reason)),
    Effect.withSpan("mosaic.gpu.device"),
  );

const trackDevice = (device: GPUDevice): GPUDevice => {
  tracked.add(device);
  live.devices += ONE;
  watchPageHide();
  runtime.runFork(lifetime(device));
  return device;
};

const destroyDevice = (device: Releasable): void => {
  if (tracked.delete(device)) {
    live.devices -= ONE;
  }
  device.destroy();
};

export { destroyDevice, trackDevice };
