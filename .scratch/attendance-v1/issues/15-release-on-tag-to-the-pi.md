# 15: Release on tag to the Pi

Part of: Spec: Attendance system v1 (`.scratch/attendance-v1/spec.md`)

**What to build:** Pushing a `v*` git tag releases the app to the Raspberry Pi, as ADR-0001 decides:

1. Build the arm64 image on GitHub's hosted ARM runner and push it to GHCR, tagged with the version.
2. Join the tailnet using the temporary Tailscale credential.
3. SSH to the Pi, set the image tag, and pull and restart the Compose stack. Migrations run before the new app container starts, and a failed migration leaves the old version serving.

Success or failure is visible in GitHub Actions. Re-running the release for an older tag rolls back.

**Blocked by:** 13 (Production image and Compose stack), 14 (One-time Pi, Tailscale and GitHub setup)

**Status:** ready-for-agent

- [ ] Pushing a `v*` tag builds and pushes an arm64 image to GHCR tagged with the version
- [ ] The workflow deploys that version to the Pi over Tailscale SSH, and the app at the Tailscale Serve address shows the new version
- [ ] A failing migration fails the workflow and leaves the previous version serving
- [ ] Re-running the release for an older tag deploys that version
- [ ] Pushes and PRs to `main` don't deploy
- [ ] No secrets appear in the repo or the logs

## Comments

**2026-11-27 (agent, from ticket 14):** The setup wizard (`scripts/setup-pi.sh`) creates these. Use exactly these names:
- Secrets: `TS_OAUTH_CLIENT_ID` and `TS_OAUTH_SECRET`, for `tailscale/github-action@v4` with `tags: tag:ci`. Also `PI_SSH_PRIVATE_KEY` (ed25519, stored with a trailing newline).
- Variables (`vars.*`): `PI_HOST` (the Pi's MagicDNS `*.ts.net` name), `PI_USER`, and `PI_SSH_KNOWN_HOSTS` (the Pi's ed25519 host key, keyed by `PI_HOST`). Use it with `StrictHostKeyChecking=yes`.
- On the Pi: deploy into `~/attendance/`. `~/attendance/.env` already holds every production setting, so the workflow must not write or print it. Copy `compose.yaml` there, set the image tag, then run `docker compose pull && docker compose up -d`. The Pi is already logged in to `ghcr.io`.
