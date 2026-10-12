import type { PointerEventHandler } from "react";

const CENTER = "0.5";
const POINTER_ATTRIBUTE = "data-pointer";

type RectSide = "left" | "top" | "width" | "height";

type Locate = (
  pointer: Readonly<{ clientX: number; clientY: number; rect: Readonly<Record<RectSide, number>> }>,
) => Readonly<{ ratioX: number; ratioY: number }>;

const pointerFollower =
  (locate: Locate): PointerEventHandler<HTMLElement> =>
  (event) => {
    const { left, top, width, height } = event.currentTarget.getBoundingClientRect();
    const { ratioX, ratioY } = locate({
      clientX: event.clientX,
      clientY: event.clientY,
      rect: { left, top, width, height },
    });
    event.currentTarget.toggleAttribute(POINTER_ATTRIBUTE, true);
    event.currentTarget.style.setProperty("--mx", String(ratioX));
    event.currentTarget.style.setProperty("--my", String(ratioY));
  };

const followPointer = pointerFollower(({ clientX, clientY, rect }) => ({
  ratioX: (clientX - rect.left) / rect.width,
  ratioY: (clientY - rect.top) / rect.height,
}));

const followViewportPointer = pointerFollower(({ clientX, clientY }) => ({
  ratioX: clientX / globalThis.innerWidth,
  ratioY: clientY / globalThis.innerHeight,
}));

const releasePointer: PointerEventHandler<HTMLElement> = ({ currentTarget }) => {
  currentTarget.toggleAttribute(POINTER_ATTRIBUTE, false);
  currentTarget.style.setProperty("--mx", CENTER);
  currentTarget.style.setProperty("--my", CENTER);
};

export { followPointer, followViewportPointer, releasePointer };
