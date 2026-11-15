import { env } from "cloudflare:workers";

import { PERSONAL_ORIGIN } from "#/shared/config";

const personal = (path: string): Promise<Response> =>
  env.PERSONAL.fetch(`${PERSONAL_ORIGIN}${path}`);

const watashi = (): typeof env.WATASHI => env.WATASHI;

const money = (): typeof env.MONEY => env.MONEY;

const slides = (): typeof env.SLIDES => env.SLIDES;

const credentials = (): typeof env.CREDENTIALS => env.CREDENTIALS;

export { credentials, money, personal, slides, watashi };
