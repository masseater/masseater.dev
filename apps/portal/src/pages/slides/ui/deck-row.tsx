import type { ReactNode } from "react";

import { dayOf } from "#/entities/slide";
import type { DeckValue } from "#/entities/slide";
import { Row, TagList } from "#/shared/ui";

import { DeckTitle } from "./deck-title";

export const DeckRow = ({ deck }: Readonly<{ deck: DeckValue }>): ReactNode => (
  <Row lead={dayOf(deck.updatedAt)}>
    <DeckTitle file={deck.file} title={deck.title} />
    <TagList tags={deck.tags} />
  </Row>
);
