export const FONT = {
  heavy: "Noto Sans JP",
  bold: "Noto Sans JP",
  code: "IBM Plex Mono",
} as const;

export type Face = keyof typeof FONT;
