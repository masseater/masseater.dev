import { Effect, Option } from "effect";
import { GM } from "vite-plugin-monkey/dist/client";

import { fire } from "./fire.ts";
import { relayUrl } from "./request.ts";
import type { RelayResponse } from "./request.ts";

type PanelValues = Readonly<{
  highlight: string;
  focus: string;
}>;

type PanelState = Readonly<{ status: "sending" }> | RelayResponse;

type Render = (state: PanelState) => void;

type PanelForm = Readonly<{
  elements: readonly HTMLElement[];
  read: () => PanelValues;
}>;

const style = `
dialog { width: min(32rem, calc(100vw - 2rem)); padding: 1rem; border: 1px solid #888; border-radius: 0.5rem; font: 14px/1.6 system-ui, sans-serif; color: #111; background: #fff; }
label { display: block; margin-top: 0.75rem; font-weight: bold; }
textarea { box-sizing: border-box; width: 100%; min-height: 5rem; margin-top: 0.25rem; font: inherit; font-weight: normal; }
menu { display: flex; gap: 0.5rem; justify-content: flex-end; margin: 1rem 0 0; padding: 0; }
output { display: block; margin-top: 0.75rem; white-space: pre-wrap; }
`;

const element = <Tag extends keyof HTMLElementTagNameMap>(
  tag: Tag,
  text: string,
): HTMLElementTagNameMap[Tag] => {
  const created = document.createElement(tag);
  created.textContent = text;
  return created;
};

const labeled = (text: string, control: HTMLElement): HTMLLabelElement => {
  const label = element("label", text);
  label.append(control);
  return label;
};

const textarea = (value: string): HTMLTextAreaElement => {
  const created = document.createElement("textarea");
  created.value = value;
  return created;
};

const button = (text: string): HTMLButtonElement => {
  const created = element("button", text);
  created.type = "button";
  return created;
};

const menuOf = (buttons: readonly HTMLElement[]): HTMLMenuElement => {
  const menu = document.createElement("menu");
  menu.append(...buttons);
  return menu;
};

const selectedText = (): string =>
  Option.fromNullishOr(globalThis.getSelection()).pipe(
    Option.map((selection) => selection.toString()),
    Option.getOrElse(() => ""),
  );

const createForm = (): PanelForm => {
  const highlight = textarea(selectedText());
  const focus = textarea("");
  return {
    elements: [labeled("気になった部分", highlight), labeled("重点的にまとめてほしいこと", focus)],
    read: () => ({ highlight: highlight.value, focus: focus.value }),
  };
};

const messageOf = (state: PanelState): string => {
  if (state.status === "sending") {
    return "送信しています。";
  }
  if (state.status === "started") {
    return "送りました。";
  }
  if (state.status === "login") {
    return "personal.masseater.dev にログインしてください。ログイン用のタブを開きます。ログインしたらもう一度送ってください。";
  }
  return `起動できませんでした。${state.reason}`;
};

const tabFor = (state: PanelState): Option.Option<string> => {
  if (state.status === "login") {
    return Option.some(relayUrl);
  }
  return Option.none();
};

const openTab = (state: PanelState): Effect.Effect<void> =>
  Option.match(tabFor(state), {
    onNone: () => Effect.void,
    onSome: (url) =>
      Effect.promise(() => Promise.resolve(GM.openInTab(url, { active: true }))).pipe(
        Effect.asVoid,
      ),
  });

const submit = (values: PanelValues, render: Render): Effect.Effect<void> =>
  Effect.gen(function* submitRequest() {
    render({ status: "sending" });
    const response = yield* fire({
      url: location.href,
      title: document.title,
      highlight: values.highlight,
      focus: values.focus,
    });
    render(response);
    yield* openTab(response);
  });

const renderer =
  (output: HTMLElement, send: HTMLElement): Render =>
  (state) => {
    output.textContent = messageOf(state);
    send.toggleAttribute("disabled", state.status === "sending" || state.status === "started");
  };

const buildDialog = (): HTMLDialogElement => {
  const form = createForm();
  const send = button("scrap にする");
  const close = button("閉じる");
  const output = document.createElement("output");
  const dialog = document.createElement("dialog");
  dialog.append(element("strong", document.title), ...form.elements, menuOf([close, send]), output);
  close.addEventListener("click", () => {
    dialog.close();
  });
  send.addEventListener("click", () => {
    Effect.runFork(submit(form.read(), renderer(output, send)));
  });
  return dialog;
};

const openPanel = (): void => {
  const host = document.createElement("div");
  const root = host.attachShadow({ mode: "closed" });
  const dialog = buildDialog();
  dialog.addEventListener("close", () => {
    host.remove();
  });
  root.append(element("style", style), dialog);
  document.body.append(host);
  dialog.showModal();
};

export { openPanel };
