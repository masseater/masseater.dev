import { Array as Arr, Effect, Ref, Stream } from "effect";

const SAVED = 0;

type Progress<Item> = Readonly<{ items: readonly Item[]; unsaved: boolean }>;

/** @internal */
const collect = Effect.fn("progress.collect")(function* collectItems<
  Item,
  Failure,
  Services,
  SaveFailure,
  SaveServices,
>({
  items,
  checkpoint,
  save,
}: Readonly<{
  items: Stream.Stream<Item, Failure, Services>;
  checkpoint: number;
  save: (items: readonly Item[]) => Effect.Effect<void, SaveFailure, SaveServices>;
}>) {
  const progress = yield* Ref.make<Progress<Item>>({ items: [], unsaved: true });
  const persist = Ref.get(progress).pipe(
    Effect.flatMap((current) => save(current.items)),
    Effect.andThen(Ref.update(progress, (current) => ({ ...current, unsaved: false }))),
  );
  yield* items.pipe(
    Stream.runForEach((item) =>
      Ref.updateAndGet(progress, (current) => ({
        items: Arr.append(current.items, item),
        unsaved: true,
      })).pipe(
        Effect.flatMap((current) =>
          Effect.when(persist, Effect.succeed(current.items.length % checkpoint === SAVED)),
        ),
      ),
    ),
    Effect.onExit(() =>
      Effect.when(persist, Ref.get(progress).pipe(Effect.map((current) => current.unsaved))),
    ),
  );
});

export { collect };
