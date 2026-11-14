import { PenLine } from "lucide-react";
import type { ReactNode } from "react";

const LABEL = "本文に書いたネタも、ここに溜まる";

const NoteRoute = (): ReactNode => (
  <li className="flex items-center gap-2">
    <PenLine aria-hidden="true" className="size-4 shrink-0" />
    {LABEL}
  </li>
);

export { NoteRoute };
