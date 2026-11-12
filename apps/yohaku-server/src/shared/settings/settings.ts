import { Context } from "effect";

class Settings extends Context.Service<
  Settings,
  {
    readonly dataDirectory: string;
    readonly mcpPort: number;
  }
>()("yohaku-server/shared/settings/settings") {}

export { Settings };
