# aredoko-desktop

This workspace is the aredoko desktop app, built with Tauri. It starts and stops the aredoko search server on the user's PC.

To look at the screens, start a development build with `vp run dev:app` and connect with `agent-browser connect 9222`.

To collect traces during development, run `vp run jaeger` before starting the development build and read the traces at `http://127.0.0.1:16686`. Put `jaeger` on your PATH yourself.
