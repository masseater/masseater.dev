import { Console, Effect } from "effect";
import { Command } from "effect/cli";
import { ChildProcessSpawner } from "effect/process";

import { openBrowser } from "./browser.ts";
import { conversationCommand, maskCommand } from "./conversation-commands.ts";
import { forgetCredentials } from "./credentials.ts";
import { hookCommand } from "./hook-command.ts";
import { login } from "./oauth.ts";
import { settings } from "./settings.ts";
import { tokenCommand } from "./token-commands.ts";

const loginCommand = Command.make("login", {}, () =>
  Effect.gen(function* signIn() {
    const current = yield* settings;
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    yield* login({
      home: current.home,
      baseUrl: current.url,
      announce: (url) => Console.error(`ブラウザで開いてログインする:\n${url}`),
      open: (url) =>
        openBrowser(url).pipe(
          Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
        ),
    });
    yield* Console.log("ログインした。");
  }),
).pipe(Command.withDescription("ブラウザで watashi にログインする"));

const logoutCommand = Command.make("logout", {}, () =>
  settings.pipe(
    Effect.flatMap((current) => forgetCredentials(current.home)),
    Effect.andThen(Console.log("ログインを消した。")),
  ),
).pipe(Command.withDescription("保存したログインを消す"));

const watashi = Command.make("watashi").pipe(
  Command.withDescription(
    "watashi（watashi.masseater.dev）の CLI。環境変数は WATASHI_SEND_CONVERSATIONS・WATASHI_TOKEN・WATASHI_URL・WATASHI_HOME・WATASHI_BETTERLEAKS",
  ),
  Command.withSubcommands([
    loginCommand,
    logoutCommand,
    tokenCommand,
    conversationCommand,
    maskCommand,
    hookCommand,
  ]),
);

/** @internal */
export { watashi };
