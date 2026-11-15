import { checkedOutVersion, component } from "@masseater.dev/component-release";
import { Effect, Path } from "effect";

const COMPONENT = "yohaku";
const OUTPUT = "installers";

/** @internal */
export const installers = Effect.gen(function* installers() {
  const path = yield* Path.Path;
  const target = yield* component(COMPONENT);
  const version = yield* checkedOutVersion(target);
  const output = path.resolve(OUTPUT);
  return {
    target,
    version,
    output,
    bundle: path.join(target.root, "target", "release", "bundle"),
    windows: path.join(output, `yohaku_${version}_x64-setup.exe`),
    mac: path.join(output, `yohaku_${version}_aarch64.app.tar.gz`),
    dmg: path.join(output, `yohaku_${version}_aarch64.dmg`),
  };
});
