import { Option, pipe } from "effect";
import type { ReactNode } from "react";

import { useSession } from "#/pages/write/api/session.ts";
import { useScreen } from "#/shared/model";

import { Writing } from "./writing.tsx";

const WritePage = (): ReactNode => {
  const [{ session }] = useScreen();
  return pipe(
    useSession(),
    Option.match({
      onNone: () => false,
      onSome: (initial) => <Writing key={session} initial={initial} />,
    }),
  );
};

export { WritePage };
