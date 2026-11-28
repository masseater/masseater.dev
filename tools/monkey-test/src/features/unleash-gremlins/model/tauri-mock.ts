export const tauriMockScript = `
(() => {
  let nextCallback = 0;
  const listeners = new Map();
  window.__TAURI_INTERNALS__ = {
    metadata: {
      currentWindow: { label: "main" },
      currentWebview: { windowLabel: "main", label: "main" },
    },
    transformCallback: (callback, once) => {
      nextCallback += 1;
      const id = nextCallback;
      listeners.set(id, { callback, once });
      window["_" + String(id)] = (...args) => {
        if (once) listeners.delete(id);
        return callback ? callback(...args) : undefined;
      };
      return id;
    },
    unregisterCallback: (id) => {
      listeners.delete(id);
    },
    convertFileSrc: (path) => path,
    invoke: async (command) => (command === "plugin:event|listen" ? nextCallback : null),
  };
  window.__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener: () => undefined };
})();
`;
