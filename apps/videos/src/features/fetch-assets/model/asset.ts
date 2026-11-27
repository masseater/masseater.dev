import type { Option } from "effect";

/** @internal */
export interface Asset {
  readonly url: string;
  readonly page: Option.Option<string>;
}

/** @internal */
export interface PageAsset {
  readonly url: string;
  readonly page: string;
}
