import type { ReactNode } from "react";

import { useSession } from "#/pages/write/api/session.ts";
import { useScreen } from "#/shared/model/index.ts";

import { Writing } from "./writing.tsx";

export const WritePage = (): ReactNode => {
  const [{ session }] = useScreen();
  if (!useSession()) {
    return false;
  }
  return <Writing key={session} />;
};
