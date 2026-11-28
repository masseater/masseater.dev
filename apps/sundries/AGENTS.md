# sundries

This workspace is the MCP server `sundries.masseater.dev/mcp`. It gathers the owner's small tools, such as Sloppedia, analytics, slide search and translation.

Do not put personal data here. Keep the portal upstream ID `sundries` the same as the end of the dashboard callback that Access DCR allows.

`write_sloppedia_article` and `write_sashi_reference` both open a pull request on masseater.dev through the `SLOPPEDIA_GITHUB` broker and turn on auto-merge. `registerPublishTool` builds them, so a new tool that writes a file there uses it too.
