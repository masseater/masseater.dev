import type { ReactNode } from "react";

const FigureCaption = ({ caption }: Readonly<{ caption: string }>): ReactNode => (
  <figcaption className="text-center">{caption}</figcaption>
);

export { FigureCaption };
