import { Effect, Option } from "effect";
import { GM } from "vite-plugin-monkey/dist/client";

import { fire } from "./fire.ts";
import { decodeSettings } from "./request.ts";
import type { FireResponse, FireSettings } from "./request.ts";
import { saveSettings } from "./storage.ts";

type PanelValues = Readonly<{
  settings: Readonly<{ fireUrl: string; token: string }>;
  highlight: string;
  focus: string;
}>;

type PanelState = Readonly<{ status: "invalid" }> | Readonly<{ status: "sending" }> | FireResponse;

type Render = (state: PanelState) => void;

type PanelForm = Readonly<{
  elements: readonly HTMLElement[];
  read: () => PanelValues;
}>;

const style = `
dialog { width: min(32rem, calc(100vw - 2rem)); padding: 1rem; border: 1px solid #888; border-radius: 0.5rem; font: 14px/1.6 system-ui, sans-serif; color: #111; background: #fff; }
label { display: block; margin-top: 0.75rem; font-weight: bold; }
textarea, input { box-sizing: border-box; width: 100%; margin-top: 0.25rem; font: inherit; font-weight: normal; }
textarea { min-height: 5rem; }
details { margin-top: 0.75rem; }
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

const input = (type: "password" | "url", value: string): HTMLInputElement => {
  const created = document.createElement("input");
  created.type = type;
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

const savedValue = (saved: Option.Option<FireSettings>, key: keyof FireSettings): string =>
  Option.match(saved, { onNone: () => "", onSome: (settings) => settings[key] });

const settingsSection = (
  saved: Option.Option<FireSettings>,
  controls: readonly HTMLElement[],
): HTMLDetailsElement => {
  const details = document.createElement("details");
  details.open = Option.isNone(saved);
  details.append(element("summary", "ルーチンの設定"), ...controls);
  return details;
};

const createForm = (saved: Option.Option<FireSettings>): PanelForm => {
  const highlight = textarea(selectedText());
  const focus = textarea("");
  const fireUrl = input("url", savedValue(saved, "fireUrl"));
  const token = input("password", savedValue(saved, "token"));
  return {
    elements: [
      labeled("気になった部分", highlight),
      labeled("重点的にまとめてほしいこと", focus),
      settingsSection(saved, [labeled("Fire URL", fireUrl), labeled("API トークン", token)]),
    ],
    read: () => ({
      settings: { fireUrl: fireUrl.value, token: token.value },
      highlight: highlight.value,
      focus: focus.value,
    }),
  };
};

const messageOf = (state: PanelState): string => {
  if (state.status === "invalid") {
    return "Fire URL は https://api.anthropic.com/v1/claude_code/routines/…/fire の形で、API トークンと一緒に入れてください。";
  }
  if (state.status === "sending") {
    return "送信しています。";
  }
  if (state.status === "started") {
    return "ルーチンを起動しました。セッションを新しいタブで開きます。";
  }
  return `起動できませんでした。${state.reason}`;
};

const openSession = (state: PanelState): Effect.Effect<void> => {
  if (state.status !== "started") {
    return Effect.void;
  }
  return Effect.promise(() => Promise.resolve(GM.openInTab(state.sessionUrl, { active: true })));
};

const submit = (values: PanelValues, render: Render): Effect.Effect<void> =>
  Effect.gen(function* submitRequest() {
    const settings = decodeSettings(values.settings);
    if (Option.isNone(settings)) {
      render({ status: "invalid" });
      return;
    }
    yield* saveSettings(settings.value);
    render({ status: "sending" });
    const response = yield* fire({
      settings: settings.value,
      request: {
        url: location.href,
        title: document.title,
        highlight: values.highlight,
        focus: values.focus,
      },
    });
    render(response);
    yield* openSession(response);
  });

const renderer =
  (output: HTMLElement, send: HTMLElement): Render =>
  (state) => {
    output.textContent = messageOf(state);
    send.toggleAttribute("disabled", state.status === "sending" || state.status === "started");
  };

const buildDialog = (saved: Option.Option<FireSettings>): HTMLDialogElement => {
  const form = createForm(saved);
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

const openPanel = (saved: Option.Option<FireSettings>): void => {
  const host = document.createElement("div");
  const root = host.attachShadow({ mode: "closed" });
  const dialog = buildDialog(saved);
  dialog.addEventListener("close", () => {
    host.remove();
  });
  root.append(element("style", style), dialog);
  document.body.append(host);
  dialog.showModal();
};

export { openPanel };
