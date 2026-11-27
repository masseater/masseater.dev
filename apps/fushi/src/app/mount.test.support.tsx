import { RegistryProvider } from "@effect/atom-react";
import { Effect } from "effect";
import type { Scope } from "effect";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";

import { App } from "#/app/ui/app.tsx";

import styles from "#/app/styles.css?inline";

type Mounted = Readonly<{ style: HTMLStyleElement; container: HTMLDivElement; root: Root }>;

const attach: Effect.Effect<Mounted> = Effect.sync(() => {
  globalThis.location.hash = "#/";
  const style = document.createElement("style");
  style.textContent = styles;
  document.head.append(style);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  root.render(
    <RegistryProvider>
      <App />
    </RegistryProvider>,
  );
  return { style, container, root };
});

export const mount: Effect.Effect<void, never, Scope.Scope> = Effect.acquireRelease(
  attach,
  ({ style, container, root }) =>
    Effect.sync(() => {
      root.unmount();
      container.remove();
      style.remove();
    }),
).pipe(Effect.asVoid);
