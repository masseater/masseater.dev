import { Duration, Option, Schema, pipe } from "effect";

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 10;
const WINDOW_MILLIS = Duration.toMillis(Duration.minutes(WINDOW_MINUTES));
const ONE_ATTEMPT = 1;

const Window = Schema.Struct({ start: Schema.Finite, count: Schema.Finite });

const WindowJson = Schema.fromJsonString(Window);

const decodeWindow = Schema.decodeOption(WindowJson);

const encodeWindow = Schema.encodeOption(WindowJson);

type Admission = Readonly<{ status: "admitted"; stored: string }> | Readonly<{ status: "limited" }>;

type Attempt = Readonly<{ now: number; stored: Option.Option<string> }>;

const LIMITED: Admission = { status: "limited" };

const isOpen =
  (now: number) =>
  ({ start }: typeof Window.Type): boolean =>
    start <= now && now - start < WINDOW_MILLIS;

const admitted = (window: typeof Window.Type): Admission =>
  Option.match(encodeWindow(window), {
    onNone: () => LIMITED,
    onSome: (stored) => ({ status: "admitted", stored }),
  });

const counted = ({ start, count }: typeof Window.Type): Admission => {
  if (count < MAX_ATTEMPTS) {
    return admitted({ start, count: count + ONE_ATTEMPT });
  }
  return LIMITED;
};

const admit = ({ now, stored }: Attempt): Admission =>
  pipe(
    stored,
    Option.flatMap(decodeWindow),
    Option.filter(isOpen(now)),
    Option.match({
      onNone: () => admitted({ start: now, count: ONE_ATTEMPT }),
      onSome: counted,
    }),
  );

export { admit };
export type { Admission, Attempt };
