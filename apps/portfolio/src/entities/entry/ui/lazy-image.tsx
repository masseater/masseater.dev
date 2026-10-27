import type { ReactNode } from "react";

const LazyImage = ({ src, alt }: Readonly<{ src: string; alt: string }>): ReactNode => (
  <img alt={alt} decoding="async" loading="lazy" src={src} />
);

export { LazyImage };
