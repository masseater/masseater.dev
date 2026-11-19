import type { ReactNode } from "react";

export const ExampleFigure = ({
  src,
  alt,
  width,
  height,
  children,
}: Readonly<{
  src: string;
  alt: string;
  width?: number;
  height?: number;
  children: ReactNode;
}>): ReactNode => (
  <figure className="flex flex-col gap-2">
    <img
      alt={alt}
      className="bg-muted w-full rounded-lg object-contain"
      height={height}
      loading="lazy"
      src={src}
      width={width}
    />
    <figcaption className="text-muted-foreground text-xs leading-relaxed">{children}</figcaption>
  </figure>
);
