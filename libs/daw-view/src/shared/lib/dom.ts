import { Record as Rec } from "effect";

export const make =
  <Tag extends keyof HTMLElementTagNameMap>(tag: Tag) =>
  (
    className: string,
    children: readonly (HTMLElement | string)[] = [],
  ): HTMLElementTagNameMap[Tag] => {
    const node = document.createElement(tag);
    node.className = className;
    node.append(...children);
    return node;
  };

export const withAttributes =
  (attributes: Readonly<Record<string, string>>) =>
  <Element extends HTMLElement>(node: Element): Element => {
    for (const [name, value] of Rec.toEntries(attributes)) {
      node.setAttribute(name, value);
    }
    return node;
  };
