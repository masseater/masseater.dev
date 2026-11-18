---
title: "Regenerating a lockfile is a version upgrade"
description: "Teams are afraid to auto-merge Renovate's update PRs, yet they commit the diff from deleting the lockfile and running npm install again without anyone reading it."
tags: ["開発", "ポエム"]
published: true
---

I do not see many teams that merge dependency upgrades automatically. Even with Renovate installed, the rule is that a person reads each PR before merging, and not only major versions but even patches pile up because "we don't know what will break." The same teams, when the lockfile has a conflict, delete it, run `npm install` again, and commit the resulting diff as it is.

Regenerating the lockfile puts in the latest versions that fit the `^` and `~` ranges in package.json, for every dependency including transitive ones. This is the same as taking all the PRs Renovate sends one by one, bundling them together, and merging them without reading the changelogs.

`npm install` does not rewrite the lockfile on its own. The [documentation](https://docs.npmjs.com/cli/commands/npm-install) says that the current npm installs the versions in the lockfile as they are, as long as they fit the ranges in package.json. It gets rewritten when you change package.json, when you add a new package and transitive dependencies are resolved again, and when you delete the lockfile. All of these are things we do every day, and each time, upgrades within the ranges happen.

Then Renovate's PRs should be treated the same way. Writing `^` already declares that updates within the range are accepted. What we are afraid of is only the changes that carry the name "version upgrade," while we accept the changes without that name every day.
