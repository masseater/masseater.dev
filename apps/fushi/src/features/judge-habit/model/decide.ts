import type { Subject } from "@r_masseater/i68-presets/habits";
import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";
import { SecureRandom } from "effect/crypto";
import { Atom, AtomRegistry } from "effect/reactivity";

import { changed, withAim, withJudgment, withoutJudgment } from "#/entities/library/index.ts";
import type { Aim, Change, Judgment } from "#/entities/library/index.ts";
import type { Verdict } from "#/shared/config/index.ts";
import { navigate, runtime } from "#/shared/lib/index.ts";
import type { Route } from "#/shared/lib/index.ts";

export const NEW_AIM = "";

const EMPTY = "";

/** @internal */
export const verdictAtom = Atom.family((_habit: string) =>
  Atom.make(Option.none<Verdict>()).pipe(Atom.keepAlive),
);

/** @internal */
export const aimChoiceAtom = Atom.family((_habit: string) =>
  Atom.make(Option.none<string>()).pipe(Atom.keepAlive),
);

/** @internal */
export const textAtom = Atom.family((_habit: string) => Atom.make(EMPTY).pipe(Atom.keepAlive));

export const chosenAim = ({
  aims,
  chosen,
}: Readonly<{ aims: readonly Aim[]; chosen: Option.Option<string> }>): string =>
  pipe(
    chosen,
    Option.orElse(() => Option.map(Arr.head(aims), (aim) => aim.id)),
    Option.getOrElse(() => NEW_AIM),
  );

export type Decision = Readonly<{
  style: string;
  habit: string;
  subject: Subject;
  category: string;
  aims: readonly Aim[];
  after: Route;
}>;

const judgedOf = (decision: Decision): Pick<Judgment, "style" | "habit" | "subject"> => ({
  style: decision.style,
  habit: decision.habit,
  subject: decision.subject,
});

type Picked = Readonly<{ decision: Decision; verdict: Verdict; text: string; aim: string }>;

const rejected = ({ decision, verdict, text }: Picked): Effect.Effect<Option.Option<Change>> =>
  Effect.succeedSome(withJudgment({ ...judgedOf(decision), verdict, reason: text }));

const intoNewAim = Effect.fnUntraced(function* intoNewAim({ decision, verdict, text }: Picked) {
  if (Str.isEmpty(text)) {
    return Option.none<Change>();
  }
  const random = yield* SecureRandom.SecureRandom;
  const id = yield* random.uuidV4();
  const aim = withAim({ id, style: decision.style, category: decision.category, name: text });
  const judged = withJudgment({ ...judgedOf(decision), verdict, aim: id });
  return Option.some<Change>((library) => judged(aim(library)));
});

const intoAim = ({ decision, verdict, aim }: Picked): Effect.Effect<Option.Option<Change>> =>
  Effect.succeedSome(withJudgment({ ...judgedOf(decision), verdict, aim }));

const changeOf = (
  picked: Picked,
): Effect.Effect<Option.Option<Change>, never, SecureRandom.SecureRandom> => {
  if (picked.verdict === "reject") {
    return rejected(picked);
  }
  if (picked.aim === NEW_AIM) {
    return intoNewAim(picked);
  }
  return intoAim(picked);
};

const pickedIn = Effect.fnUntraced(function* pickedIn(decision: Decision) {
  const registry = yield* AtomRegistry.AtomRegistry;
  const text = registry.get(textAtom(decision.habit));
  const chosen = registry.get(aimChoiceAtom(decision.habit));
  return Option.map(registry.get(verdictAtom(decision.habit)), (verdict) => ({
    decision,
    verdict,
    text: Str.trim(text),
    aim: chosenAim({ aims: decision.aims, chosen }),
  }));
});

const judged = Effect.fnUntraced(function* judged(decision: Decision) {
  const picked = yield* pickedIn(decision);
  if (Option.isNone(picked)) {
    return;
  }
  const change = yield* changeOf(picked.value);
  if (Option.isNone(change)) {
    return;
  }
  yield* changed(change.value);
  navigate(decision.after);
});

/** @internal */
export const judgeAtom = runtime.fn(judged);

/** @internal */
export const undoAtom = runtime.fn((target: Readonly<{ style: string; habit: string }>) =>
  changed(withoutJudgment(target)),
);
