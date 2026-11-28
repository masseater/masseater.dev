export const guardScript = `
window.alert = () => undefined;
window.confirm = () => false;
window.prompt = () => null;
window.open = () => null;
document.addEventListener("click", (event) => {
  const anchor = event.target instanceof Element ? event.target.closest("a") : null;
  if (anchor) anchor.target = "_self";
}, true);
`;

export const linksScript =
  "Array.from(document.querySelectorAll('a[href]'), (anchor) => anchor.href)";
