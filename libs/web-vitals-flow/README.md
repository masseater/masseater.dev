# @r_masseater/web-vitals-flow

Measures Web Vitals of page loads and same-origin link transitions with
[Lighthouse user
flows](https://github.com/GoogleChrome/lighthouse/blob/main/docs/user-flows.md).
It reports LCP, INP and CLS. It also reports FCP, TTFB and TBT. It fails when
LCP, INP or CLS of
any step misses the passing score of Lighthouse.

It requires Node.js 26 or later and Chrome.

```sh
vp dlx @r_masseater/web-vitals-flow https://example.com/
```

`--chrome-flags` passes space-separated flags to Chrome. In a container, pass
`--chrome-flags="--no-sandbox"`. Set `CHROME_PATH` when Chrome is not found.

## License

MIT
