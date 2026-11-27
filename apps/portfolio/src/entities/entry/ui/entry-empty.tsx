import type { ReactNode } from "react";

const EMPTY_MESSAGE = "まだ何もない。";

export const EntryEmpty = (): ReactNode => (
  <p className="glass-surface text-foreground/70 font-display px-6 py-16 text-center text-sm tracking-widest">
    {EMPTY_MESSAGE}
  </p>
);
