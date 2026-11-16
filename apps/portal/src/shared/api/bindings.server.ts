import { env } from "cloudflare:workers";

import { PERSONAL_ORIGIN } from "#/shared/config/index.ts";

export const personal = (path: string): Promise<Response> =>
  env.PERSONAL.fetch(`${PERSONAL_ORIGIN}${path}`);

export const watashi = (): typeof env.WATASHI => env.WATASHI;

export const money = (): typeof env.MONEY => env.MONEY;

export const slides = (): typeof env.SLIDES => env.SLIDES;

export const credentials = (): typeof env.CREDENTIALS => env.CREDENTIALS;
