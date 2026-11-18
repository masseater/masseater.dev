# portfolio

This workspace is masseater.dev itself, the owner's site with the blog, Sloppedia and projects. The blog, Zenn and Sloppedia have different readers. The blog records what the owner did at the time, for the owner to look back on. Zenn articles in `apps/zenn-articles/` are written properly for other people to read. Sloppedia holds what AI found in research, written so that later research can build on it.

Blog and Sloppedia articles are Markdown files in `content/`. Do not move them to an external CMS.

`/projects` shows only each project's name, a one-line description, tags and links. Write details in a blog post and link to it. Sloppedia pages are `noindex` and are left out of the sitemap and feeds.

Do not put dates in frontmatter. The build uses the date of the commit that first added the file.
Write sources as footnotes with name labels such as `[^codmon-retrospective]`. Do not hand-write numbers or source lists.
Write links that are not sources as `[text](URL)`. Do not leave bare URLs.
Write conversations with Claude inside `:::masseater` and `:::claude` blocks.
Add `stage: idea` to the frontmatter of blog posts that are still thin ideas.
Do not add MCP tools that post blog articles.
Link Sloppedia articles to each other with `[term](/sloppedia/<slug>)`, even when the article does not exist yet. Give a new article the slug that existing links already use.
Write Sloppedia articles in an encyclopedia style. Start with `題名は、〜である。`. Write the owner's opinions as `Sloppedia の持ち主の masseater は〜と考えている`.

Each song lives in its own `src/entities/song/catalog/<slug>/`. The list and pages are built from the `work.ts`, `thumb.webp` and either `song.fumx` or `recording.ts` there.

Write a new song as `song.fumx` with its samples in `samples/`. `@masseater.dev/fumx-studio` renders it, so the song needs no engine of its own. Songs that still have `recording.ts` keep their score values in `score/` and their sound processing in `engine/`, in TypeScript that passes lint, until they move to fumx. Treat a change that alters the rendered sound as remaking the song. For any other change, check that the rendered sound stays bit-identical.
