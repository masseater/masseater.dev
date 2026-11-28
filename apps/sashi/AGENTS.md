# sashi

This workspace is `sashi.masseater.dev`, a static site where the owner collects the references that stand in for what they want, and publishes them.

A reference is one JSON file in `content/`, and `libs/sashi` owns its shape. The sundries MCP writes them with `write_sashi_reference` and reads them back from `/references.json`. A reference holds a link, the owner's own words and, for the thumbnail, the address of the work's own preview image. This site exists to quote other people's works, so quoting a work or its image here is allowed by the owner (2026-11-28), an exception to the repository rule on copyrighted works. Stay within the requirements for a quotation: the owner's own words are the main part, the quoted part is clearly marked as quoted, its source is shown by the link, and it is no more than the site needs. The thumbnail is the work's own preview image, linked from its original address and never saved here.

`bin/write-site.ts` renders every page from `content/` into `dist/`: the list of all references and one page per kind. The pages carry no script and no inline style, and the Content-Security-Policy in `_headers` allows only the site's own files.

The site is an assets-only Worker with no script, so every request is a static asset request, which Cloudflare does not bill.
