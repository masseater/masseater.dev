import { Option, pipe } from "effect";
import type { ReactNode } from "react";

const FailedNote = ({ error }: Readonly<{ error: Readonly<Error> | null }>): ReactNode =>
  pipe(
    Option.fromNullOr(error),
    Option.match({
      onNone: () => false,
      onSome: (failed) => (
        <p className="text-destructive text-sm" role="alert">
          {failed.message}
        </p>
      ),
    }),
  );

export { FailedNote };
