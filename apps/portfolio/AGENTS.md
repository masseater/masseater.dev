# portfolio

This workspace is masseater.dev itself, the owner's site with the blog, Slog, Sloppedia and projects. The blog, Slog, Zenn and Sloppedia have different readers. The blog holds only text the owner wrote by hand. Slog holds text that only the owner's AI writes, and every Slog page says so before the title. Zenn articles in `apps/zenn-articles/` are written properly for other people to read. Sloppedia holds what AI found in research, written so that later research can build on it.

Blog, Slog and Sloppedia articles are Markdown files in `content/`. Do not move them to an external CMS. Put every AI-written post in `content/slog/`, never in `content/blogs/`, which stays empty until the owner writes something. The old `/blogs/<slug>` URLs of posts that moved to Slog redirect to `/slog/<slug>`. The build generates the `_redirects` file from `content/slog/`.

`/projects` shows only each project's name, a one-line description, tags and links. Write details in a Slog post and link to it. Sloppedia pages are `noindex` and are left out of the sitemap and feeds. Sashi at `/sashi` is the owner's public shelf of references. A reference holds a link and the owner's own words, never a copy of someone else's work or an image of it.
Do not put dates in frontmatter. The build uses the date of the commit that first added the file.
Write sources as footnotes with name labels such as `[^codmon-retrospective]`. Do not hand-write numbers or source lists.
Write links that are not sources as `[text](URL)`. Do not leave bare URLs.
Write conversations with Claude inside `:::masseater` and `:::claude` blocks.
Add `stage: idea` to the frontmatter of Slog and blog posts that are still thin ideas.
Do not add MCP tools that post Slog or blog articles.

Link Sloppedia articles to each other with `[term](/sloppedia/<slug>)`, even when the article does not exist yet. Give a new article the slug that existing links already use.
Write Sloppedia articles in an encyclopedia style. Start with `題名は、〜である。`. Write the owner's opinions as `Sloppedia の持ち主の masseater は〜と考えている`.

Each song lives in its own `src/entities/song/model/catalog/<slug>/`. The list and pages are built from the `work.ts`, `thumb.webp` and either `song.fumx` or `recording.ts` there.

Write a new song as `song.fumx` with its samples in `samples/`. `@masseater.dev/fumx-studio` renders it, so the song needs no engine of its own. A song with `recording.ts` keeps score values in `score/` and sound processing in `engine/` until it moves to fumx. That code is TypeScript that passes lint. Treat a change that alters the rendered sound as remaking the song. For any other change, check that the rendered sound stays bit-identical.
