import { String as Str } from "effect";

export interface Endpoints {
  readonly api: string;
  readonly web: string;
}

const isStandard = (host: string): boolean =>
  host === "github.com" || Str.endsWith(".ghe.com")(host);

export const endpointsOf = (hostname: string): Endpoints => {
  const web = `https://${hostname}`;
  if (isStandard(Str.toLowerCase(hostname))) {
    return { api: `https://api.${hostname}`, web };
  }
  return { api: `${web}/api/v3`, web };
};
