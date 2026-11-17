# @r_masseater/fumx-parser

This workspace is a published library that reads the song file format `.fumx` into a song value with notes and controllers placed in time.

The grammar is in `src/features/read-song/model/fumx.langium`. After changing it, run `vp run grammar` to regenerate the parser in `generated/langium`.
