---
title: "Developing a public service in a public repository"
description: "What hiding code protects is small, and in an era when AI builds clones, it is even smaller. The cheapest way for an individual developer to show trustworthiness is to develop in a public repository, but the many eyes do not reach an individual's repository, so safety has to come from piling up free automated checks."
tags: ["GitHub", "OSS", "セキュリティ"]
published: true
---

Bitwarden, a password management service, publishes all of its source code on GitHub, from the server to the clients and the browser extensions[^bitwarden]. Although it holds its users' passwords, far from hiding its code, it makes the fact that the code is public a selling point. Services that publish their code in the same way and still work as businesses are common and close at hand: GitLab, Sentry, Plausible, Cal.com, Signal and more.

Even so, when it comes to building a public service yourself, there is hesitation about making the repository public. The worries can be sorted into two. One is the worry that publishing the source gives attackers clues, and the other is the worry that it will be copied as it is and the business will not work. In this post, after examining these two in turn, I write about what you gain by publishing, the downsides that come from publishing, and what should be kept separate from the code.

## Code being visible and a system being broken are different things

In cryptography, the principle that a system should be secure even if everything about how it works is known, as long as the key does not leak, has been known since the 19th century. It is called Kerckhoffs's principle[^kerckhoffs], and modern cryptography such as AES and TLS is designed with the specifications and implementations made public. Bank communications are not broken because what supports their security is not the secrecy of the mechanism but the secrecy of the keys.

The same goes for a service's code: what has to be protected is not the code but the API keys and authentication tokens, the database connection details, the signing keys and the access rights to production. Even when developing in a private repository, these should properly be managed separately from the code. In other words, feeling safe because the code is hidden cannot be told apart from a state where a vulnerability already exists and simply has not been found yet. Looking back at the data breaches of the past few years, most of the causes were not that code was read but were concentrated on leaked credentials and misconfigurations.

Developing in a public repository forces this separation from the start. Secrets go out into environment variables or a secret manager and are never mixed into commits. It looks like extra work, but it means getting right from the start the design that is most expensive to fix later. GitHub's secret scanning runs for free on public repositories, and AWS or Stripe keys that slip into a commit are detected within minutes, reported to their issuers and revoked[^secret-scanning]. The worry about being attacked is a problem of design and operation, not a problem of publishing itself.

## Some things cannot be taken away even if the code is copied

Copying the code does not carry away the users and their data, the domain and recognition in search, the history of continued operation, or the track record of dealing with bugs. Most of a service's value is on this side. GitLab's code is entirely public[^gitlab], but there is no example of someone forking it and making it succeed as a competing service. Plausible publishes its code under the AGPL[^plausible] while continuing its business with paid hosting. What users pay for is not the code but having someone take on the work of running it themselves. For individual developers in particular, the risk of ending without anyone knowing about it before it is ever imitated is far greater than the risk of being imitated.

Moreover, now in 2026, even if the code is hidden, once the screens and behavior are shown, an AI agent can build something that is the same for users in a few hours. Over the past few years, keeping things closed has almost entirely lost its effect of preventing imitation. That ideas and appearances can be cloned right away means, conversely, that no place where users can see a difference remains in the appearance. What remains is the inside, and only showing that the mechanism is solid by publishing even the internal code is something the clones cannot imitate. To imitate it, they would have to publish too, and then it could no longer be called a clone.

## What you gain by publishing

If what hiding protects was small to begin with and is even smaller now, then publishing is the better deal if there is anything at all to gain from it. What you gain comes in several layers.

### Trust can only be shown on the inside

Anyone can build the same appearance, so the only place users can find a difference is the inside. Anyone can write in a privacy policy that they do not share data with third parties, but a state where you can check in the code where data is sent is something different from that text. For an individual developer without a company's name behind them, this becomes almost the only way to gain trust. Bitwarden probably makes publishing its code a selling point because, for users choosing whom to trust with their passwords, this ability to verify is what they want most.

### The one who checks is AI, not people

Users ask AI "how does this service handle my data," and the AI reads the public repository directly and answers based on the code. Even users who cannot read code receive the difference of whether it is public as a difference in the quality of the answer. The same is true when I develop with AI: passing a single link conveys the context. Public code is being read by machines even if no person reads it.

### Track record and continuity

It also becomes the author's own track record. For the person evaluating, a running service with its code and commit history carries more information than writing on a résumé that you developed and operated a service. It also secures the continuity of the service. Even if the author steps away, there is a way for it to survive through a fork, and because users know this, they can trust a service made by an individual with their data.

It also becomes a window for receiving bug reports, translation PRs and contact from security researchers. However, the amount that reaches an individual's repository is small, and expecting too much here is dangerous. I touch on this point next.

### Costs go down

On a practical note, many GitHub features are free for public repositories.

| Feature                           | public                           | private                                                          |
| --------------------------------- | -------------------------------- | ---------------------------------------------------------------- |
| GitHub Actions                    | Free with no limit on usage time | Up to 2,000 minutes a month. Overage is billed[^actions-billing] |
| CodeQL                            | Free                             | GitHub Advanced Security (paid)[^ghas]                           |
| secret scanning / push protection | Free                             | GitHub Advanced Security (paid)                                  |
| Dependabot                        | Free                             | Free                                                             |
| private vulnerability reporting   | Free                             | Not available                                                    |
| GitHub Pages                      | Free                             | Requires a paid plan                                             |

Quite a few SaaS products, such as Sentry, Vercel, 1Password and JetBrains, offer free plans for OSS.

This cost difference used to be something you did not have to care about. But once you leave development to AI agents, the number of commits and CI runs grows to dozens of times what it was when people wrote the code. Agents run tests to check whether their changes are correct, so CI is no longer an accessory to development but the substance of development itself. For GitHub, the growth of public repositories is valuable in itself, so it makes CI for public repositories free. Developers can ride on that interest. Which SaaS products offer what for free to OSS will be covered in a separate post.

## The downside: the "many eyes" do not reach an individual's repository

There is a common belief that OSS is safe. It holds only when there is a cycle in which, because many people use it, vulnerabilities are found, reported and fixed. That cycle works for the Linux kernel and OpenSSL, but not for an individual's public repository. Because nobody reads it.

Even if you put code that obviously allows SQL injection in public, a good-faith report will almost never come. Even in OpenSSL, which many people use, Heartbleed sat in the public code unnoticed for two years[^heartbleed]. A repository nobody reads is readable, but not read.

On the other hand, attackers do read. More precisely, not people but scanners read. Crawling public repositories on GitHub exhaustively and looking for known vulnerable patterns is something anyone can do now. What I wrote earlier, that hiding does not protect you, is correct, but it does not mean showing is the same; the difference appears in how long it takes to be found. The eyes of good will do not reach you, but the scanners of ill will do. This asymmetry is the biggest downside of an individual developing in public.

What fills the gap is again machines: instead of human eyes, you pile up automated checks that run for free on public repositories. Besides GitHub's CodeQL, Dependabot and secret scanning, there are several SaaS products open for free to OSS, such as Snyk, Semgrep, Socket, Trivy and Aikido. Many of them are paid or limited for private repositories, so the risk created by publishing is offset by tools you can use precisely because you publish. The safety of an individual's public repository is built on this piling up, not on a community, and it is better not to expect from the start that someone will look at it.

## Accidents caused by publishing itself come in four kinds

1. Leaking secrets. Do not commit .env files or authentication tokens. A key that has entered the history remains even after you delete it, so if it leaks, deal with it by revoking it, not by deleting it. If you enable push protection in secret scanning, pushes containing secrets are rejected on the spot.
2. Licenses. If you do not want the code resold as a SaaS as it is, use the AGPL; if you want it to be used widely, use MIT or Apache 2.0. Without a license, nobody can legally use it even if it is public. The service name and logo are separate from the code and are protected under trademark thinking.
3. Handling a discovered vulnerability. Do not accept reports in public Issues. Enable GitHub's private vulnerability reporting[^pvr] and show the contact point in SECURITY.md. The moment you push a fix, the diff becomes public, and the diff points straight at the location of the vulnerability, so push only after deploying to production.
4. The burden of responding. Even if Issues and PRs come, you do not need to respond to all of them. It is enough to write in the README that it is a personal project and responses are not guaranteed.

Publishing Terraform or Kubernetes manifests makes the whole infrastructure configuration visible, but that in itself is not a vulnerability. If it bothers you, you can split just that part into a separate repository. None of the things listed here are about whether to publish the code; they are about what to keep separate from the code.

## Separating the parts you do not publish

What is better left unpublished is limited to things that get circumvented once they are known: the logic for detecting abuse, the thresholds for spam detection, the specific numbers for rate limits, exceptions in pricing calculations, the parts related to contracts with business partners, and so on. These are put out as settings in environment variables, or split into a small private repository or a private package. It is the same idea as Sentry and GitLab separating their commercial features into separate directories or separate licenses. As a result of the separation, the setup settles into 90% of the code being public and the rest being settings and secrets. This setup is how things should be even without making them public, and making them public means nothing other than making it impossible to put off that design.

## Safe to show, and trusted because it is shown

Back to the question at the start. A service that holds passwords shows all of its code because its design is safe to show. At the same time, it is trusted precisely because it shows its code. These two are two sides of the same thing. In an era when AI writes code, the scarcity of code itself goes down. What remains is the trust of "who runs it, for what, and how." The cheapest way to show that is to develop in a public repository.

[^bitwarden]: [Bitwarden の GitHub organization](https://github.com/bitwarden)

[^kerckhoffs]: [Kerckhoffs's principle - Wikipedia](https://en.wikipedia.org/wiki/Kerckhoffs%27s_principle)

[^secret-scanning]: [About secret scanning - GitHub Docs](https://docs.github.com/en/code-security/secret-scanning/introduction/about-secret-scanning)

[^gitlab]: [GitLab のソースコード](https://gitlab.com/gitlab-org/gitlab)

[^plausible]: [plausible/analytics](https://github.com/plausible/analytics)

[^actions-billing]: [About billing for GitHub Actions - GitHub Docs](https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-actions/about-billing-for-github-actions)

[^ghas]: [About GitHub Advanced Security - GitHub Docs](https://docs.github.com/en/get-started/learning-about-github/about-github-advanced-security)

[^heartbleed]: [The Heartbleed Bug](https://heartbleed.com/)

[^pvr]: [Configuring private vulnerability reporting for a repository - GitHub Docs](https://docs.github.com/en/code-security/security-advisories/working-with-repository-security-advisories/configuring-private-vulnerability-reporting-for-a-repository)
