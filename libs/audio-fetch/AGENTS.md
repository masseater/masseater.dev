# @masseater.dev/audio-fetch

This workspace is a Rust library that downloads only the audio from YouTube, Niconico and SoundCloud. It calls each site's API directly and saves the original audio without re-encoding it.

When the built-in download fails, it downloads the official yt-dlp build pinned by version and hash, and uses that instead. When a site change breaks the built-in download, fix it by following how yt-dlp handles the site. Failures leave their reason on a tracing span.

Tests do not touch the network. They check how site responses are read with hand-written response fragments.
