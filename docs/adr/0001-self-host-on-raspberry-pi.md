# Self-host on a Raspberry Pi with tag-triggered deploys over Tailscale

The app is a Next.js app, but it is deliberately not deployed to Vercel: a goal of the project is to learn how to deploy Next.js elsewhere while keeping a Vercel-like "push and it ships" workflow. It runs on a Raspberry Pi 5 (16 GB, SSD) under Docker Compose, with Next.js (standalone output) and Postgres side by side. Pushing a `v*` git tag makes GitHub Actions build an arm64 image on a GitHub-hosted ARM runner, push it to GHCR, then join the tailnet with an ephemeral key and SSH to the Pi to `docker compose pull && up -d`. Migrations run as a one-off step before the new app container starts, and a failed migration leaves the old version running. The app is reachable only inside the tailnet via Tailscale Serve (HTTPS on `*.ts.net`). Rolling back means deploying the previous tag.

## Considered Options

- **Vercel**: rejected because learning non-Vercel deployment is the point.
- **Self-hosted GitHub Actions runner on the Pi**: rejected because a fork's pull request on a public repo could run code on the Pi.
- **Pull-based updates (Watchtower polling GHCR)**: rejected because the deploy is invisible in GitHub, which is unlike the Vercel experience we're imitating.
- **Building the image on the Pi**: rejected because it's slow, and GitHub's ARM runners produce the image natively.
- **Cloudflare Tunnel for a public URL**: rejected because it needs a domain, and none will be bought for this project. Tailscale Funnel would give a public URL if one is ever wanted.
