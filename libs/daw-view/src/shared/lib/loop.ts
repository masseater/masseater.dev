export interface Loop {
  readonly kick: () => void;
  readonly paint: () => void;
  readonly start: (frame: () => boolean) => void;
  readonly stop: () => void;
}

const NONE = 0;

const idle = (): boolean => false;

export const createLoop = (): Loop => {
  const state = { frame: idle, pending: NONE };
  const kick = (): void => {
    if (state.pending === NONE) {
      state.pending = requestAnimationFrame(() => {
        state.pending = NONE;
        if (state.frame()) {
          kick();
        }
      });
    }
  };
  return {
    kick,
    paint: (): void => {
      if (state.frame()) {
        kick();
      }
    },
    start: (next): void => {
      state.frame = next;
      kick();
    },
    stop: (): void => {
      state.frame = idle;
      cancelAnimationFrame(state.pending);
      state.pending = NONE;
    },
  };
};
