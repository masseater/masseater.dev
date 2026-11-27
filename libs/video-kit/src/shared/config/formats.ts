export const FORMATS = ["vertical", "horizontal"] as const;

export type Format = (typeof FORMATS)[number];

export interface Frame {
  readonly width: number;
  readonly height: number;
  readonly safe: {
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly left: number;
  };
}

export const FRAMES: Readonly<Record<Format, Frame>> = {
  vertical: { width: 1080, height: 1920, safe: { top: 288, right: 192, bottom: 672, left: 48 } },
  horizontal: { width: 1920, height: 1080, safe: { top: 54, right: 96, bottom: 54, left: 96 } },
};

export const FPS = 30;
