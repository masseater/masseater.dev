export const FONT = {
  impact: "Dela Gothic One",
  pop: "Mochiy Pop One",
  text: "M PLUS Rounded 1c",
  code: "IBM Plex Mono",
} as const;

export type Face = keyof typeof FONT;
