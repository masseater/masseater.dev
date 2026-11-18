# @masseater.dev/fumx-studio

This workspace turns a `.fumx` song into sound in the browser. It renders each track and bus into stereo stems, mixes them, and hands the stems and the mix to `libs/daw-view`.

Every song on portfolio's `/ai-produced` plays through this workspace. Sound that only one song needs goes into that song's plugin modules, which the song's `.fumx` declares with `plugin`.
