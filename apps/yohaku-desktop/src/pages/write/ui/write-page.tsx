import { Option } from "effect";
import type { ReactNode } from "react";

import { useSession } from "#/pages/write/api/session.ts";
import { useScreen } from "#/shared/model";

import { Writing } from "./writing.tsx";

const WritePage = (): ReactNode => {
  const [{ session }] = useScreen();
  return Option.match(useSession(), {
    onNone: () => null,
    onSome: (initial) => <Writing key={session} initial={initial} />,
  });
};

export { WritePage };
