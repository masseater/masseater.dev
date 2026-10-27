import type { ReactNode } from "react";

import type { Example } from "#/entities/technique/model/technique";

import { ImageExample } from "./image-example";
import { LinkExample } from "./link-example";
import { YouTubeExample } from "./youtube-example";

const ExampleView = ({ example }: Readonly<{ example: Example }>): ReactNode => {
  if (example.kind === "image") {
    return <ImageExample example={example} />;
  }
  if (example.kind === "youtube") {
    return <YouTubeExample example={example} />;
  }
  return <LinkExample example={example} />;
};

export { ExampleView };
