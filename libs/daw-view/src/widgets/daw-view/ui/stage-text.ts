export const say =
  (node: HTMLElement) =>
  (text: string): void => {
    if (node.textContent !== text) {
      node.textContent = text;
    }
  };

export const mark =
  (node: HTMLElement) =>
  (name: string, value: string): void => {
    if (node.getAttribute(name) !== value) {
      node.setAttribute(name, value);
    }
  };
