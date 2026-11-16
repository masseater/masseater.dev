import type { Comment } from "@masseater.dev/akapen-protocol";
import { keyOf } from "@masseater.dev/media-notes-ui";
import { Array as Arr, Order, Record, pipe } from "effect";

export type Shelf = Readonly<{ latest: Comment; count: number }>;

const byNewest = Order.flip(Order.mapInput(Order.Number, ({ latest }: Shelf) => latest.at));

export const shelvesOf = (comments: readonly Comment[]): readonly Shelf[] =>
  pipe(
    Arr.groupBy(comments, ({ media }) => keyOf(media.source)),
    Record.values,
    Arr.map((group) => ({ latest: Arr.headNonEmpty(group), count: group.length })),
    Arr.sortBy(byNewest),
  );
