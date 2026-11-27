# masseater.dev

Follow `masseater-ecosystem`, a skill in masseater/skills that says which skills to load in each situation. `vp install` puts the skills in `.agents/skills/`.

Each workspace has its own AGENTS.md describing it and the rules that apply only there. Read it before changing that workspace.

## Tech stack

The base stack is TypeScript 7, Effect, Alchemy and Cloudflare.

## Commands

- `vp run verify` runs every check in this repository. The pre-push hook runs the same checks.
- To run one test, run `vp test run <file>` in that package's directory.

## Rules

- Build every check of the repository, such as lint rules and convention checks, into msch. Do not create checks anywhere else.
- Do not write private repository names in this repository or in masseater/skills. Refer to a private repository by its repository ID.
- Do not write the owner's email address in this repository. Refer to the reusable Access policy `OwnerPolicy` instead.
- Do not let requests through Cloudflare Access with service tokens or bypass policies. Agents get in with the owner's login through the credential broker.
- Put a site's resources next to the app's stack. Put parts that affect a whole zone or account in the Cloudflare account stack.
- Do not put copyrighted works such as songs or source footage in the repository.
- Every deviation from an upstream package is temporary. Put it only in the root `pnpm-workspace.yaml` (`overrides`, `patchedDependencies`, `packageExtensions`) or the root `Cargo.toml` (`[patch]`), and end its line with `# exit: <condition>` that msch-exits can check.
- Pay-as-you-go billing is expensive and hard to predict, AI above all. Keep all Cloudflare usage within what the Workers Paid plan includes. For any feature that adds pay-as-you-go usage, including AI, estimate and measure the cost before building it, after building it, before using it and after using it, and check that it stays within the Workers Paid included usage. If it exceeds the free or included usage and costs more than $0.10 a day, do not build it unless the owner says so.
