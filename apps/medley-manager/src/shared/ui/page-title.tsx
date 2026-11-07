import type { ReactNode } from "react";

const PageTitle = ({
  title,
  description,
}: Readonly<{ title: string; description: string }>): ReactNode => (
  <div className="flex flex-col gap-2">
    <h1 className="font-display text-3xl">{title}</h1>
    <p className="text-muted-foreground">{description}</p>
  </div>
);

export { PageTitle };
