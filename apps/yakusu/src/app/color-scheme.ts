const DARK = "(prefers-color-scheme: dark)";

const followColorScheme = (): void => {
  const query = globalThis.matchMedia(DARK);
  const apply = (): void => {
    document.documentElement.classList.toggle("dark", query.matches);
  };
  apply();
  query.addEventListener("change", apply);
};

export { followColorScheme };
