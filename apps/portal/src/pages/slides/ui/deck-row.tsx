import type { ReactNode } from "react";

import { dayOf } from "#/entities/slide/index.ts";
import type { DeckValue } from "#/entities/slide/index.ts";
import { Row, TagList } from "#/shared/ui/index.ts";

import { DeckTitle } from "./deck-title.tsx";

export const DeckRow = ({ deck }: Readonly<{ deck: DeckValue }>): ReactNode => (
  <Row lead={dayOf(deck.updatedAt)}>
    <DeckTitle file={deck.file} title={deck.title} />
    <TagList tags={deck.tags} />
  </Row>
);
