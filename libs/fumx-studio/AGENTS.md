# @masseater.dev/fumx-studio

This workspace turns a `.fumx` song into sound in the browser. It renders each track and bus into stereo stems, mixes them, and hands the stems and the mix to `libs/daw-view`.

Every song on portfolio's `/ai-produced` plays through this workspace. Sound that only one song needs goes into that song's plugin modules, which the song's `.fumx` declares with `plugin`.

A plugin module exports `plugin`, either an `InstrumentPlugin` that a kit voice names or a `MixPlugin` that the `master … mix` line names. A mix plugin replaces the built-in mixdown: no track is pasted until it calls `play` for that track. The contract is in `src/shared/lib/plugin/plugin.ts`.

A mix plugin may paste a track into a bus it made with `playInto`, and may return its own `live` player, a worklet that plays the plugin's stems. Track buses are made only when a plugin asks for them, because a stereo bus of a five-minute song takes about 100 MB.
