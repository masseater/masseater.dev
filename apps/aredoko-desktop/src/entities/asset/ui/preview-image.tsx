import type { ReactNode } from "react";

export const PreviewImage = ({
  source,
  alt,
}: Readonly<{ source: string; alt: string }>): ReactNode => (
  <img src={source} alt={alt} className="size-full object-contain" />
);
