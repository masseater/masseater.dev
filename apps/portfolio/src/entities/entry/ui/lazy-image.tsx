import type { ReactNode } from "react";

export const LazyImage = ({ src, alt }: Readonly<{ src: string; alt: string }>): ReactNode => (
  <img alt={alt} decoding="async" loading="lazy" src={src} />
);
