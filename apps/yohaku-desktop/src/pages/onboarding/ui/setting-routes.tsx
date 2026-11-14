import type { ReactNode } from "react";

import { ClaudeRoute } from "./claude-route.tsx";
import { NoteRoute } from "./note-route.tsx";

const SettingRoutes = (): ReactNode => (
  <ul className="text-muted-foreground flex flex-col gap-2 text-sm">
    <NoteRoute />
    <ClaudeRoute />
  </ul>
);

export { SettingRoutes };
