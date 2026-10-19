type CssVariables = Readonly<Record<`--${string}`, number | string>>;

declare module "react" {
  interface CSSProperties extends Partial<CssVariables> {}
}

export type { CssVariables };
