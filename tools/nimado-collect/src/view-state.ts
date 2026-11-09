import { Array as Arr, Option, Order, Record, Schema, pipe } from "effect";

const Observation = Schema.Tuple([Schema.OptionFromNullOr(Schema.Int), Schema.String]);

const ViewState = Schema.Record(Schema.String, Observation);

type ObservationValue = typeof Observation.Type;
type ViewStateValue = typeof ViewState.Type;

const HOT_VIEWS = 5000;

const isHot = ([views]: ObservationValue): boolean =>
  Option.exists(views, (count) => count >= HOT_VIEWS);

const fetchedAt = ([, [, at]]: readonly [string, ObservationValue]): string => at;

const pickVideos = ({
  state,
  ids,
  budget,
  rotationDays,
}: Readonly<{
  state: ViewStateValue;
  ids: readonly string[];
  budget: number;
  rotationDays: number;
}>): readonly string[] => {
  const known = pipe(
    ids,
    Arr.flatMap((id) =>
      pipe(
        Record.get(state, id),
        Option.map((observation) => [id, observation] as const),
        Option.toArray,
      ),
    ),
  );
  const fresh = pipe(
    ids,
    Arr.filter((id) => !Record.has(state, id)),
  );
  const hot = pipe(
    known,
    Arr.filter(([, observation]) => isHot(observation)),
  );
  const cold = pipe(
    known,
    Arr.filter(([, observation]) => !isHot(observation)),
  );
  const rotation = pipe(
    cold,
    Arr.sortWith(fetchedAt, Order.String),
    Arr.take(Math.ceil(cold.length / rotationDays)),
  );
  return pipe(
    [...hot, ...rotation],
    Arr.map(([id]) => id),
    (picked) => [...picked, ...fresh],
    Arr.take(budget),
  );
};

const observe = ({
  state,
  ids,
  views,
  date,
}: Readonly<{
  state: ViewStateValue;
  ids: readonly string[];
  views: Readonly<Record<string, number>>;
  date: string;
}>): ViewStateValue => ({
  ...state,
  ...pipe(
    ids,
    Arr.map((id) => [id, [Record.get(views, id), date] as ObservationValue] as const),
    Record.fromEntries,
  ),
});

const keepOnly = ({
  state,
  keep,
  since,
}: Readonly<{ state: ViewStateValue; keep: readonly string[]; since: string }>): ViewStateValue => {
  const wanted = new Set(keep);
  return pipe(
    state,
    Record.filter(([, at], id) => wanted.has(id) && at >= since),
  );
};

export type { ViewStateValue };
export { ViewState, keepOnly, observe, pickVideos };
