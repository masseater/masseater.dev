# task-cache

This workspace is `task-cache.masseater.dev`. It serves the Vite Task remote cache, so that CI and cloud sessions share the results of `vp run`.

- Only a GitHub Actions run on the main branch of one of the owner's repositories can store. The namespace in the URL is the repository name.
- The client reads without a token, so a namespace is readable only while its repository is public.
- `src/shared/config/limits.ts` holds the caps that keep R2 and D1 within the usage the Workers Paid plan includes. The account is shared with other apps, so measure the usage of the whole account before raising a cap.
