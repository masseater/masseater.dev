# @masseater.dev/daw-view

This workspace draws DAW-style song pages (transport, waveform, tracks, piano roll). portfolio's `/ai-produced/<song>` uses it.

The page makes the sound. This workspace only shows and plays what the page reports.

Track volume, pan and mute use the names and units of the `.fumx` mixer in `libs/song-format`. Solo is screen state and is not written to the song.
