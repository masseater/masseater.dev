import {
  Context,
  Duration,
  Effect,
  FiberHandle,
  HashMap,
  HashSet,
  Layer,
  Option,
  Queue,
  Ref,
  pipe,
} from "effect";

import { blmLinker } from "./link-blm.ts";
import { scanLibrary } from "./scan-library.ts";
import type { Activity } from "./scan-library.ts";
import { watchSources } from "./watch-folders.ts";

const PENDING_REQUESTS = 1;
const FAILED_SCAN_RETRY = Duration.fromInputUnsafe("1 minute");

interface ProjectGuids {
  readonly projectPath: string;
  readonly guids: readonly string[];
}

type Seen = HashMap.HashMap<string, HashSet.HashSet<string>>;

const IDLE: Activity = { status: "idle" };

class Library extends Context.Service<
  Library,
  {
    readonly activity: Effect.Effect<Activity>;
    readonly requestScan: Effect.Effect<void>;
    readonly sourcesChanged: Effect.Effect<void>;
    readonly remember: (project: ProjectGuids) => Effect.Effect<HashSet.HashSet<string>>;
    readonly forget: (projectPath: string) => Effect.Effect<void>;
  }
>()("aredoko-server/features/library/model/library") {}

const remember =
  ({ projectPath, guids }: ProjectGuids) =>
  (
    seen: HashMap.HashMap<string, HashSet.HashSet<string>>,
  ): readonly [HashSet.HashSet<string>, Seen] => {
    const previous = pipe(
      HashMap.get(seen, projectPath),
      Option.getOrElse(() => HashSet.empty<string>()),
    );
    const all = HashSet.union(previous, HashSet.fromIterable(guids));
    return [all, HashMap.set(seen, projectPath, all)];
  };

const retryingScan = Effect.fn("retryingScan")(function* retryingScan({
  activity,
  requestScan,
}: Readonly<{ activity: Ref.Ref<Activity>; requestScan: Effect.Effect<void> }>) {
  const blm = yield* blmLinker;
  const retry = yield* FiberHandle.make();
  const scheduleScan = (wait: Duration.Duration): Effect.Effect<void> =>
    FiberHandle.run(retry, Effect.andThen(Effect.sleep(wait), requestScan)).pipe(Effect.asVoid);
  const scan = scanLibrary({
    blm,
    report: (current) => Ref.set(activity, current),
  }).pipe(
    Effect.catchCause((cause) =>
      Effect.logError("scan failed", cause).pipe(Effect.as(Option.some(FAILED_SCAN_RETRY))),
    ),
    Effect.ensuring(Ref.set(activity, IDLE)),
    Effect.flatMap(Option.match({ onNone: () => Effect.void, onSome: scheduleScan })),
  );
  return { scan };
});

/** @internal */
const libraryLayer = Layer.effect(
  Library,
  Effect.gen(function* makeLibrary() {
    const activity = yield* Ref.make<Activity>(IDLE);
    const requests = yield* Queue.sliding<boolean>(PENDING_REQUESTS);
    const seen = yield* Ref.make<Seen>(HashMap.empty());
    const requestScan = Queue.offer(requests, true).pipe(Effect.asVoid);
    const { scan } = yield* retryingScan({ activity, requestScan });
    yield* Queue.take(requests).pipe(Effect.andThen(scan), Effect.forever, Effect.forkScoped);
    const { sourcesChanged } = yield* watchSources(requestScan);
    yield* requestScan;
    return Library.of({
      activity: Ref.get(activity),
      requestScan,
      sourcesChanged,
      remember: (project) => Ref.modify(seen, remember(project)),
      forget: (projectPath) => Ref.update(seen, HashMap.remove(projectPath)),
    });
  }),
);

export { Library, libraryLayer };
