import type { ReactNode } from "react";

const ProjectItem = ({
  name,
  description,
}: Readonly<{ name: string; description: string }>): ReactNode => (
  <li className="flex flex-col gap-1 py-4">
    <a
      className="text-primary font-semibold underline underline-offset-4"
      href={`https://github.com/masseater/${name}`}
    >
      {name}
    </a>
    <p className="text-muted-foreground text-sm">{description}</p>
  </li>
);

export { ProjectItem };
