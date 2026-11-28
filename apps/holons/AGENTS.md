# holons

This workspace is `holons.masseater.dev`, a static page with the zoomable figure of the owner's nested holons.

`public/index.html` is the figure wrapped in a document. Keep its contents byte for byte as drawn: the formatter skips it, and `bin/write-site.ts` copies it to `dist/` unchanged and writes a `_headers` file whose Content-Security-Policy hashes its inline script and style.

The site is an assets-only Worker with no script, so every request is a static asset request, which Cloudflare does not bill.

`public/index.html` is the only source of the figure. The artifact on claude.ai shows the same page without the document wrapper. Change the zoom code and the drawing in this file, then publish the artifact from it, so that no copy behaves differently.

To make the artifact file, drop the doctype, the `html`, `head` and `body` tags, and the charset and viewport metas. Put the `title` first and add `<meta name="claude:viewport-fit-sides" content="cover">` after it.
