# @masseater.dev/like-pattern

This workspace makes LIKE searches on D1 match search terms literally.

- LIKE has no escape in Drizzle, so `%` and `_` in a term would act as wildcards. A searched table keeps a `search_key` column (`searchKeyColumns`) holding its searched text with `%` and `_` replaced by `％` and `＿`, and `containingPattern` and `startingPattern` apply the same replacement to the term.
- The app's migrations keep `search_key` up to date with SQLite triggers and backfill it, using the same replacement as `searchKeyOf`. The app does not write it.
- D1 rejects patterns longer than 50 bytes, so a longer term is cut to its longest prefix that fits.
