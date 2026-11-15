import { Option, pipe } from "effect";

export interface Card {
  readonly title: string;
  readonly description: string;
  readonly image: string;
  readonly url: string;
}

export type Meta =
  | Readonly<{ title: string }>
  | Readonly<{ name: string; content: string }>
  | Readonly<{ property: string; content: string }>;

const cardMeta = (card: Card): Meta[] => [
  { title: card.title },
  { name: "description", content: card.description },
  { property: "og:type", content: "website" },
  { property: "og:title", content: card.title },
  { property: "og:description", content: card.description },
  { property: "og:image", content: card.image },
  { property: "og:url", content: card.url },
  { name: "twitter:card", content: "summary_large_image" },
];

export const optionalCardMeta = (card: Option.Option<Card>): Meta[] =>
  pipe(
    card,
    Option.map(cardMeta),
    Option.getOrElse((): Meta[] => []),
  );
