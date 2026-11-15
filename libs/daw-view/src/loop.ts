export interface Loop {
  readonly kick: () => void;
  readonly paint: () => void;
  readonly start: (frame: () => boolean) => void;
}

const idle = (): boolean => false;

export const createLoop = (): Loop => {
  let frame = idle;
  let pending = false;
  const kick = (): void => {
    if (!pending) {
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        if (frame()) {
          kick();
        }
      });
    }
  };
  return {
    kick,
    paint: () => {
      if (frame()) {
        kick();
      }
    },
    start: (next) => {
      frame = next;
      kick();
    },
  };
};
