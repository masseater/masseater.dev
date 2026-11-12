import type { ReactNode } from "react";

import { useSession } from "#/pages/write/api/session.ts";
import { useScreen } from "#/shared/model";

import { Writing } from "./writing.tsx";

const WritePage = (): ReactNode => {
  const [{ session }] = useScreen();
  if (!useSession()) {
    return false;
  }
  return <Writing key={session} />;
};

export { WritePage };
