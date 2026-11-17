# npm-publish

This workspace publishes the packages in `libs/` to npm.

A name not yet on npm cannot be published through the OIDC of publish.yml. Running `claim-npm-names` in the task workflow with the `github` credentials publishes a placeholder version with one owner-approved login and registers the Trusted Publisher. The approval link is posted to an Issue.
