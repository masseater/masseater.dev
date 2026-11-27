# @masseater.dev/d1-test

This workspace gives tests a real Cloudflare D1 database, with the app's migrations applied, and a real R2 bucket, both from Miniflare. Tests pass them to the code under test instead of mocking `cloudflare:workers`.
