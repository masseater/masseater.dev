import type { ReactNode } from "react";

export const FigureCaption = ({ caption }: Readonly<{ caption: string }>): ReactNode => (
  <figcaption className="text-center">{caption}</figcaption>
);
