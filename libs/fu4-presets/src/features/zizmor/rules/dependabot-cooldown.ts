import { Array as Arr, Option, pipe } from "effect";

import {
  updateLocation,
  updateLocationWithGrip,
  updatesOf,
} from "#/features/zizmor/lib/dependabot.ts";
import type { UpdateView } from "#/features/zizmor/lib/dependabot.ts";
import { at, confidence, finding, severity } from "#/features/zizmor/lib/finding.ts";
import { annotated, primary, withKeys } from "#/features/zizmor/lib/location.ts";
import type { Audit } from "#/features/zizmor/model/audit.ts";
import type { UpdateModel } from "#/features/zizmor/model/dependabot.ts";
import type { FindingDraft, SymbolicLocation } from "#/features/zizmor/model/finding.ts";

const meta = {
  ident: "dependabot-cooldown",
  desc: "insufficient cooldown in Dependabot updates",
} as const;

const DEFAULT_DAYS = 3;

const defaultDays = (update: UpdateModel): number =>
  Option.getOrElse(
    pipe(
      update.cooldown,
      Option.flatMap((cooldown) => cooldown.defaultDays),
    ),
    () => DEFAULT_DAYS,
  );

const implicit = (minimum: number): string =>
  `insufficient implicit default-days (less than ${String(minimum)})`;

const locationOf =
  (minimum: number) =>
  (update: UpdateView, model: UpdateModel): SymbolicLocation => {
    const base = updateLocation(update);
    return Option.match(model.cooldown, {
      onNone: () => annotated(implicit(minimum))(primary(updateLocationWithGrip(update))),
      onSome: (cooldown) =>
        Option.match(cooldown.defaultDays, {
          onNone: () => annotated(implicit(minimum))(primary(withKeys("cooldown")(base))),
          onSome: () =>
            annotated(`insufficient default-days configured (less than ${String(minimum)})`)(
              primary(withKeys("cooldown", "default-days")(base)),
            ),
        }),
    });
  };

const draftOf =
  (minimum: number) =>
  (update: UpdateView): Option.Option<FindingDraft> =>
    pipe(
      Arr.get(update.input.model.updates, update.index),
      Option.filter((model) => defaultDays(model) < minimum),
      Option.map((model) =>
        pipe(
          finding(meta),
          at(locationOf(minimum)(update, model)),
          confidence("high"),
          severity("medium"),
        ),
      ),
    );

export const dependabotCooldown: Audit = {
  ...meta,
  dependabot: (dependabot, context) =>
    pipe(
      updatesOf(dependabot),
      Arr.map(draftOf(context.config.cooldownDays)),
      Arr.takeWhile(Option.isSome),
      Arr.flatMap(Option.toArray),
    ),
};
