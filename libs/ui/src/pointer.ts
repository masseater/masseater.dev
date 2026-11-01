import type { PointerEventHandler } from "react";

const CENTER = "0.5";
const POINTER_ATTRIBUTE = "data-pointer";
const STAGE_LAYER = "[data-stage-layer]";

type RectSide = "left" | "top" | "width" | "height";

type Locate = (
  pointer: Readonly<{ clientX: number; clientY: number; rect: Readonly<Record<RectSide, number>> }>,
) => Readonly<{ ratioX: number; ratioY: number }>;

type Targets = (stage: HTMLElement) => readonly HTMLElement[];

const self: Targets = (stage) => [stage];

const stageLayers: Targets = (stage) => [...stage.querySelectorAll<HTMLElement>(STAGE_LAYER)];

const place = (
  targets: readonly HTMLElement[],
  pointer: Readonly<{ active: boolean; ratioX: string; ratioY: string }>,
): void => {
  for (const target of targets) {
    target.toggleAttribute(POINTER_ATTRIBUTE, pointer.active);
    target.style.setProperty("--mx", pointer.ratioX);
    target.style.setProperty("--my", pointer.ratioY);
  }
};

const pointerFollower =
  (locate: Locate, targets: Targets): PointerEventHandler<HTMLElement> =>
  (event) => {
    const { left, top, width, height } = event.currentTarget.getBoundingClientRect();
    const { ratioX, ratioY } = locate({
      clientX: event.clientX,
      clientY: event.clientY,
      rect: { left, top, width, height },
    });
    place(targets(event.currentTarget), {
      active: true,
      ratioX: String(ratioX),
      ratioY: String(ratioY),
    });
  };

const pointerReleaser =
  (targets: Targets): PointerEventHandler<HTMLElement> =>
  ({ currentTarget }) => {
    place(targets(currentTarget), { active: false, ratioX: CENTER, ratioY: CENTER });
  };

const followPointer = pointerFollower(
  ({ clientX, clientY, rect }) => ({
    ratioX: (clientX - rect.left) / rect.width,
    ratioY: (clientY - rect.top) / rect.height,
  }),
  self,
);

const followViewportPointer = pointerFollower(
  ({ clientX, clientY }) => ({
    ratioX: clientX / globalThis.innerWidth,
    ratioY: clientY / globalThis.innerHeight,
  }),
  stageLayers,
);

const releasePointer = pointerReleaser(self);

const releaseStageLayers = pointerReleaser(stageLayers);

export { followPointer, followViewportPointer, releasePointer, releaseStageLayers };
