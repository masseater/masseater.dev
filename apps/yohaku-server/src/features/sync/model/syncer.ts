import { Clock, Context, Effect, Layer, Option, Ref, Schedule, Semaphore, pipe } from "effect";

import { pendingCount } from "./outbox.ts";
import { syncRound } from "./round.ts";
import type { Services } from "./round.ts";
import { authorizationRequest, exchangeCode, refreshGrant } from "./sync-auth.ts";
import { SyncFailed, asSyncFailed } from "./sync-failed.ts";
import { clearState, readState } from "./sync-state.ts";

const REFRESH_MARGIN = 60_000;
const INTERVAL = "20 seconds";
const ONE_ROUND = 1;

interface Grant {
  readonly accessToken: string;
  readonly expiresAt: number;
}

interface Login {
  readonly state: string;
  readonly verifier: string;
}

interface Progress {
  readonly syncedAt: Option.Option<number>;
  readonly problem: Option.Option<string>;
}

interface SyncerState {
  readonly grant: Ref.Ref<Option.Option<Grant>>;
  readonly login: Ref.Ref<Option.Option<Login>>;
  readonly progress: Ref.Ref<Progress>;
  readonly exclusive: <Value, Failure, Requirement>(
    effect: Effect.Effect<Value, Failure, Requirement>,
  ) => Effect.Effect<Value, Failure, Requirement>;
}

interface Status {
  readonly connected: boolean;
  readonly syncedAt: number | null;
  readonly pending: number;
  readonly problem: string | null;
}

class Syncer extends Context.Service<
  Syncer,
  {
    readonly status: Effect.Effect<Status, SyncFailed>;
    readonly signIn: Effect.Effect<string, SyncFailed>;
    readonly callback: (url: string) => Effect.Effect<void, SyncFailed>;
  }
>()("yohaku-server/features/sync/model/syncer") {}

const refreshed = Effect.fn("refreshed")(function* refreshed(grant: Ref.Ref<Option.Option<Grant>>) {
  const refreshToken = yield* readState("refresh_token");
  if (Option.isNone(refreshToken)) {
    return Option.none<string>();
  }
  const next = yield* refreshGrant(refreshToken.value);
  yield* Ref.set(grant, Option.some(next));
  return Option.some(next.accessToken);
});

const accessToken = Effect.fn("accessToken")(function* accessToken(
  grant: Ref.Ref<Option.Option<Grant>>,
) {
  const now = yield* Clock.currentTimeMillis;
  const cached = yield* Ref.get(grant);
  const fresh = pipe(
    cached,
    Option.filter(({ expiresAt }) => expiresAt - now > REFRESH_MARGIN),
  );
  if (Option.isSome(fresh)) {
    return Option.some(fresh.value.accessToken);
  }
  return yield* refreshed(grant);
}, asSyncFailed);

const round = Effect.fn("round")(function* round(state: SyncerState) {
  const token = yield* accessToken(state.grant);
  if (Option.isNone(token)) {
    return;
  }
  yield* syncRound(token.value);
  const now = yield* Clock.currentTimeMillis;
  yield* Ref.set(state.progress, { syncedAt: Option.some(now), problem: Option.none() });
});

const recorded = Effect.fn("recorded")(function* recorded(
  state: SyncerState,
  failure: Readonly<{ message: string; signedOut: boolean }>,
) {
  if (failure.signedOut) {
    yield* Ref.set(state.grant, Option.none());
    yield* clearState("refresh_token").pipe(Effect.ignore);
  }
  yield* Ref.update(state.progress, (current) => ({
    ...current,
    problem: Option.some(failure.message),
  }));
  yield* Effect.logWarning("sync.failed", { message: failure.message });
});

const syncOnce = (state: SyncerState): Effect.Effect<void, never, Services> =>
  round(state).pipe(
    Effect.catchTag("SyncFailed", ({ message, signedOut }) =>
      recorded(state, { message, signedOut }),
    ),
    state.exclusive,
  );

const statusOf = Effect.fn("statusOf")(function* statusOf(progress: Ref.Ref<Progress>) {
  const refreshToken = yield* readState("refresh_token");
  const pending = yield* pendingCount();
  const { syncedAt, problem } = yield* Ref.get(progress);
  return {
    connected: Option.isSome(refreshToken),
    syncedAt: Option.getOrNull(syncedAt),
    pending,
    problem: Option.getOrNull(problem),
  };
}, asSyncFailed);

const signInWith = Effect.fn("signIn")(function* signIn(login: Ref.Ref<Option.Option<Login>>) {
  const { url, state, verifier } = yield* authorizationRequest();
  yield* Ref.set(login, Option.some({ state, verifier }));
  return url;
});

const callbackWith = Effect.fn("callback")(function* callback(state: SyncerState, url: string) {
  const waiting = yield* Ref.get(state.login).pipe(
    Effect.flatMap(Effect.fromOption),
    Effect.mapError(() => SyncFailed.make({ message: "no sign-in is waiting", signedOut: false })),
  );
  const next = yield* exchangeCode({ callback: url, ...waiting });
  yield* Ref.set(state.grant, Option.some(next));
  yield* Ref.set(state.login, Option.none());
  yield* Effect.forkDetach(syncOnce(state));
}, asSyncFailed);

const makeState = Effect.gen(function* makeState() {
  const grant = yield* Ref.make(Option.none<Grant>());
  const login = yield* Ref.make(Option.none<Login>());
  const progress = yield* Ref.make<Progress>({ syncedAt: Option.none(), problem: Option.none() });
  const lock = yield* Semaphore.make(ONE_ROUND);
  return { grant, login, progress, exclusive: lock.withPermits(ONE_ROUND) } satisfies SyncerState;
});

/** @internal */
const syncerLayer = Layer.effect(
  Syncer,
  Effect.gen(function* syncer() {
    const context = yield* Effect.context<Services>();
    const state = yield* makeState;
    const local = Effect.provideContext(context);
    const repeated = syncOnce(state).pipe(Effect.repeat(Schedule.spaced(INTERVAL)));
    yield* Effect.forkScoped(local(repeated));
    const status = statusOf(state.progress);
    const signIn = signInWith(state.login).pipe(asSyncFailed);
    return Syncer.of({
      status: local(status),
      signIn: local(signIn),
      callback: (url) => local(callbackWith(state, url)),
    });
  }),
);

export { Syncer, syncerLayer };
