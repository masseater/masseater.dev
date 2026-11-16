import type { ReactNode } from "react";

import type { Example } from "#/entities/technique/model/technique.ts";

import { ImageExample } from "./image-example.tsx";
import { LinkExample } from "./link-example.tsx";
import { YouTubeExample } from "./youtube-example.tsx";

export const ExampleView = ({ example }: Readonly<{ example: Example }>): ReactNode => {
  if (example.kind === "image") {
    return <ImageExample example={example} />;
  }
  if (example.kind === "youtube") {
    return <YouTubeExample example={example} />;
  }
  return <LinkExample example={example} />;
};
