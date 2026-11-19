# @masseater.dev/fumx-studio

This workspace turns a `.fumx` song into sound in the browser. It renders each track and bus into stereo stems, mixes them, and hands the stems and the mix to `libs/daw-view`.

Every song on portfolio's `/ai-produced` plays through this workspace. Sound that only one song needs goes into that song's plugin modules, which the song's `.fumx` declares with `plugin`.

A plugin module exports `plugin`, either an `InstrumentPlugin` that a kit voice names or a `MixPlugin` that the `master … mix` line names. A mix plugin replaces the built-in mixdown: no track is pasted until it calls `play` for that track. The contract is in `src/shared/lib/plugin/plugin.ts`.

A mix plugin may paste a track into a bus it made with `playInto`, and may return its own `live` player, a worklet that plays the plugin's stems. Track buses are made only when a plugin asks for them, because a stereo bus of a five-minute song takes about 100 MB.

A mix plugin can also export `part`, which renders one named part (for example one track's whole chain) into a packed stem from a fresh request. When the plugin calls `parts(keys)`, the app's parts worker (`./parts-worker`, `serveParts`) renders the parts in a pool of workers, each with its own copy of the song and samples, and hands them back in key order with their log entries. Without workers, or for parts a lost worker left behind, `parts` runs `part` on the calling thread. A part must not depend on state that other parts change, so that both ways give the same samples.
