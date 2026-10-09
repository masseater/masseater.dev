import type { PointerEventHandler, ReactNode } from "react";

import { Backdrop } from "./backdrop";
import { ProfileHeader } from "./profile-header";

const CENTER = "0.5";
const POINTER_ATTRIBUTE = "data-pointer";

const followPointer: PointerEventHandler<HTMLElement> = ({ currentTarget, clientX, clientY }) => {
  const { left, top, width, height } = currentTarget.getBoundingClientRect();
  currentTarget.toggleAttribute(POINTER_ATTRIBUTE, true);
  currentTarget.style.setProperty("--mx", String((clientX - left) / width));
  currentTarget.style.setProperty("--my", String((clientY - top) / height));
};

const releasePointer: PointerEventHandler<HTMLElement> = ({ currentTarget }) => {
  currentTarget.toggleAttribute(POINTER_ATTRIBUTE, false);
  currentTarget.style.setProperty("--mx", CENTER);
  currentTarget.style.setProperty("--my", CENTER);
};

const HomePage = (): ReactNode => (
  <main
    className="stage relative isolate grid min-h-dvh place-items-center overflow-hidden px-4"
    onPointerCancel={releasePointer}
    onPointerLeave={releasePointer}
    onPointerMove={followPointer}
  >
    <Backdrop />
    <ProfileHeader />
  </main>
);

export { HomePage };
