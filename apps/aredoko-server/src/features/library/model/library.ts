import { Context, Effect, HashMap, HashSet, Layer, Option, Queue, Ref, pipe } from "effect";

import { retryFailedImages } from "./embed-images.ts";
import { blmLinker } from "./link-blm.ts";
import { scanLibrary } from "./scan-library.ts";
import type { Activity } from "./scan-library.ts";
import { watchSources } from "./watch-folders.ts";

const PENDING_REQUESTS = 1;

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

const retried = retryFailedImages.pipe(
  Effect.catchCause((cause) => Effect.logError("retry failed", cause)),
);

/** @internal */
const libraryLayer = Layer.effect(
  Library,
  Effect.gen(function* makeLibrary() {
    const activity = yield* Ref.make<Activity>(IDLE);
    const requests = yield* Queue.sliding<boolean>(PENDING_REQUESTS);
    const seen = yield* Ref.make<Seen>(HashMap.empty());
    const linkBlm = yield* blmLinker;
    const scan = scanLibrary({
      linkBlm,
      report: (current) => Ref.set(activity, current),
    }).pipe(
      Effect.catchCause((cause) => Effect.logError("scan failed", cause)),
      Effect.ensuring(Ref.set(activity, IDLE)),
    );
    yield* Queue.take(requests).pipe(Effect.andThen(scan), Effect.forever, Effect.forkScoped);
    const requestScan = Queue.offer(requests, true).pipe(Effect.asVoid);
    const { sourcesChanged } = yield* watchSources(requestScan);
    yield* Effect.andThen(retried, requestScan);
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
