# @masseater.dev/cloudflare-account

This workspace holds the Cloudflare settings that apply to a whole zone or account, such as WAF rules, log storage and read-only tokens.

This repository owns the masseater.dev zone. The Logpush settings apply to every Worker in the account.

It also holds `./app-name`, which every app's stack uses to check that each Cloudflare resource starts with the app name.
