---
title: "Claiming new npm names from a cloud container"
description: "A new npm package name cannot be published through Trusted Publishing until the package exists. This post records how eight names were reserved from a Claude Code cloud container with the owner's web 2FA approvals, and what failed before it worked."
tags: ["npm", "Trusted Publishing", "GitHub Actions", "Claude Code"]
published: true
---

Every package in masseater.dev is published by `publish.yml`, a GitHub Actions workflow that I dispatch by hand with the workspace to publish. It authenticates to npm with Trusted Publishing (OIDC), so the repository holds no npm token. This works only for names that already exist on npm. On 2026-11-18, eight new names were needed at once: `@r_masseater/fu4-presets`, `fumx-parser`, `h56m`, `h56m-linux-x64-gnu`, `h56m-win32-x64-msvc`, `h56m-presets`, `wism-presets` and `y8-presets`. msch, the convention checker, depends on most of them, so msch could not be installed from npm until they were out.

## Why a new name needs the owner

npm lets you configure a trusted publisher only for a package that already exists[^npm-trust]. So the first version of a new name cannot come from the OIDC workflow. Configuring trust also requires 2FA on the account, and npm does not accept granular access tokens that bypass 2FA for trust commands[^npm-trust]. The token that CI can reach gets E404 when it tries to create a new name.

That leaves one step that only the owner can do: approve a 2FA prompt for each write. The plan was to do everything else from the container:

1. Log in with `npm login --auth-type=web` and have the owner approve the login link.
2. Publish a placeholder version `0.0.0` of each name. It contains only a `package.json` (MIT license, repository URL) and a README saying that the version only reserves the name.
3. Run `npm trust github <name> --file publish.yml --repository masseater/masseater.dev --environment npm --yes` for each name.
4. Bump the real versions in a pull request and dispatch `publish.yml`.

Steps 2 and 3 each need one approval per package, so eight names cost one login plus sixteen approvals.

## What npm web authentication does

When npm needs 2FA through the browser, the registry answers the write with 401 and a body holding two URLs. `authUrl` is the page the owner opens. `doneUrl` is polled by the CLI. It returns 202 while the owner has not approved yet, 200 with a one-time token once they have, and 404 after about five minutes, when the request expires. The CLI then repeats the write with that token as the OTP. The 401 body includes these URLs only when the request carries the header `npm-auth-type: web`.

## What failed

The first login used `npm login --auth-type=web` with stdin closed. Without a terminal, npm fell back to a `Username:` prompt and never printed a link. Wrapping it in `script` to give it a pseudo-terminal printed the link, and the login was approved, but the `script` process kept running at 90% CPU after npm had exited, and the saved token was lost with it.

The login that worked used a small Node.js script instead of the CLI. It POSTs to `https://registry.npmjs.org/-/v1/login`, prints `loginUrl`, and polls `doneUrl` every 300 ms over a single keep-alive connection (`https.Agent` with `maxSockets: 1`). When the poll returns 200, it writes the token to a temporary npmrc with mode 600.

For the placeholders, I first ran eight `npm publish` processes in parallel under `script`, collected the eight `authUrl`s from their output, and posted them together. All eight expired. The debug log of each process showed the same thing: 96 polls answered with 202, then one 404. npm never saw an approval. The second set of eight did exactly the same.

An earlier session had found that this container changes its egress IP from one connection to the next, and that `doneUrl` returns 403 to an IP other than the one that started the request. This time no poll returned 403, so the logs do not show that problem. They only show that no approval reached npm before the links expired. I did not find out whether the owner's approvals were lost somewhere or never made.

## What worked

The third and fourth attempts did the writes with npm's own libraries, but outside the CLI. One Node.js process per package loads `libnpmpublish` and `npm-registry-fetch` from the global npm install and passes them `authType: "web"` and `maxSockets: 1`. The process sends the publish, catches the 401, prints `authUrl`, polls `doneUrl` once a second on its single connection, and repeats the publish with the token when the poll returns 200.

The third set expired like the first two. The fourth set, sent at 03:46 UTC, went through: all eight placeholders were published within about two minutes. The owner had ticked "don't ask again for 5 minutes" on the approval page, but each write still produced its own link.

Trust used the same pattern. `npm trust` POSTs to `/-/package/<name>/trust` with a body like this one:

```json
[
  {
    "type": "github",
    "claims": {
      "repository": "masseater/masseater.dev",
      "workflow_ref": { "file": "publish.yml" },
      "environment": "npm"
    },
    "permissions": ["createPackage"]
  }
]
```

The `permissions` field is required. The CLI fills it from `--allow-publish`, and at least one permission flag must be given[^npm-trust]. A watcher script started the trust request for each name as soon as the registry returned 200 for that package, because trust fails on a name the registry does not show yet. The placeholder for `fumx-parser` took about four minutes to appear, so its trust link came last. Two of the trust links expired and were sent again.

After the last approval, the npm session was logged out and the temporary npmrc was deleted. Then `publish.yml` published `y8-presets`, `wism-presets`, `fumx-parser`, `h56m-presets` and `h56m` through OIDC, followed by msch.

## What to change

Most of the cost was the number of approvals. Each new name costs two, and per-OS native packages such as `h56m-linux-x64-gnu` multiply the names. Fewer new names means fewer approvals, for example by shipping native binaries inside the main package, or by grouping presets into one package per tool as was done here.

The single-connection publisher and trust script should replace the CLI calls in the repository's name-claiming tool, so the next claim does not start with the CLI path that failed.

[^npm-trust]: [npm trust](https://docs.npmjs.com/cli/v11/commands/npm-trust), npm Docs, checked on 2026-11-18.
