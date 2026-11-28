# @masseater.dev/like-pattern

This workspace turns a search term into a LIKE pattern that D1 accepts. D1 rejects patterns longer than 50 bytes, so a longer term is cut to its longest prefix that fits, and the search matches on that prefix.
