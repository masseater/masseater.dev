import { QueryClient } from "@tanstack/react-query";
import { Effect } from "effect";
import type { Scope } from "effect";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";

import { Providers } from "#/app/providers.tsx";
import { TranslatorPage } from "#/pages/translator";
import type { Engine } from "#/shared/api";

import styles from "#/app/styles.css?inline";

type Mounted = Readonly<{ style: HTMLStyleElement; container: HTMLDivElement; root: Root }>;

const attach = (engine: Engine): Effect.Effect<Mounted> =>
  Effect.sync(() => {
    const style = document.createElement("style");
    style.textContent = styles;
    document.head.append(style);
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    root.render(
      <Providers client={new QueryClient()} engine={engine}>
        <TranslatorPage />
      </Providers>,
    );
    return { style, container, root };
  });

const mount = (engine: Engine): Effect.Effect<void, never, Scope.Scope> =>
  Effect.acquireRelease(attach(engine), ({ style, container, root }) =>
    Effect.sync(() => {
      root.unmount();
      container.remove();
      style.remove();
      document.documentElement.classList.remove("dark");
    }),
  ).pipe(
    Effect.andThen(
      Effect.promise(() => Promise.all(Array.from(document.fonts, (face) => face.load()))),
    ),
  );

export { mount };
