import type { ReactNode } from "react";

const ExampleFigure = ({
  src,
  alt,
  children,
}: Readonly<{ src: string; alt: string; children: ReactNode }>): ReactNode => (
  <figure className="flex flex-col gap-2">
    <img alt={alt} className="bg-muted w-full rounded-lg object-contain" loading="lazy" src={src} />
    <figcaption className="text-muted-foreground text-xs leading-relaxed">{children}</figcaption>
  </figure>
);

export { ExampleFigure };
