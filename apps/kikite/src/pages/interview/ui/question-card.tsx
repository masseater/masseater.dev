import type { ReactNode } from "react";

const QuestionCard = ({
  label,
  reason,
  question,
}: Readonly<{ label: string; reason: string; question: string }>): ReactNode => (
  <div className="flex flex-col gap-2">
    <span className="text-muted-foreground text-xs">{label}</span>
    <p className="text-muted-foreground text-sm">{reason}</p>
    <p className="text-2xl leading-snug font-semibold">{question}</p>
  </div>
);

export { QuestionCard };
