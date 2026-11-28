# sashi

This workspace is `sashi.masseater.dev`, a static site where the owner collects the references that stand in for what they want, and publishes them.

A reference is one JSON file in `content/`, and `libs/sashi` owns its shape. The sundries MCP writes them with `write_sashi_reference` and reads them back from `/references.json`. A reference holds a link and the owner's own words. Never put a copy of someone else's work, or an image or thumbnail of it, in `content/`.

`bin/write-site.ts` renders every page from `content/` into `dist/`: the list of all references and one page per kind. The pages carry no script and no inline style, and the Content-Security-Policy in `_headers` allows only the site's own files.

The site is an assets-only Worker with no script, so every request is a static asset request, which Cloudflare does not bill.
