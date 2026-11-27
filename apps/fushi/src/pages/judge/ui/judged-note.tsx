import { Option } from "effect";
import type { ReactNode } from "react";

export const JudgedNote = ({
  aim,
  reason,
}: Readonly<{
  aim: Option.Option<Readonly<{ name: string; href: string }>>;
  reason: string;
}>): ReactNode =>
  Option.match(aim, {
    onNone: () => <span className="text-muted-foreground">{reason}</span>,
    onSome: ({ name, href }) => (
      <a className="underline-offset-2 hover:underline" href={href}>
        {name}
      </a>
    ),
  });
