import { Option, pipe } from "effect";

const nameTransition = (element: HTMLElement | null): void => {
  const target = Option.fromNullishOr(element);
  const name = pipe(
    target,
    Option.flatMap((node) => Option.fromNullishOr(node.dataset["vt"])),
  );
  if (Option.isSome(target) && Option.isSome(name)) {
    target.value.style.setProperty("view-transition-name", name.value);
  }
};

export { nameTransition };
