# 14: One-time Pi, Tailscale and GitHub setup

Part of: Spec: Attendance system v1 (`.scratch/attendance-v1/spec.md`)

**What to build:** Only the owner can do these one-time steps, so they need a person rather than an agent. Use `/wizard` to generate an interactive script that walks through them and captures the values:

- initialise the git repo and create the GitHub repo
- on the Raspberry Pi 5: install Docker, install Tailscale and join the tailnet, and expose the app port over HTTPS with Tailscale Serve
- create the Tailscale credential the release workflow uses to join the tailnet temporarily, and an SSH key that lets it log in to the Pi
- add the GitHub Actions secrets: the Tailscale credential, the SSH key and host, and the production env values
- let the Pi pull images from GHCR
- install Tailscale on the Kiosk tablet and the Admin's laptop

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] The project is in a GitHub repo, and CI runs on push
- [x] The Pi runs Docker and is on the tailnet, and Tailscale Serve provides an `https://…ts.net` address for the app port
- [x] The GitHub secrets exist for the release workflow (ticket 15)
- [x] The Pi can pull this repo's images from GHCR
- [x] The Kiosk tablet and Admin laptop can reach the Pi over Tailscale

## Comments

**2026-11-27 (agent):** The wizard is `scripts/setup-pi.sh`: run `./scripts/setup-pi.sh` in Git Bash from the repo. It has 12 stages: GitHub CLI login, Pi connection check, Docker, Tailscale on the Pi, Tailscale on this PC, Tailscale Serve (HTTPS → port 3000), the `tag:ci` policy entry, the Tailscale OAuth client, a deploy SSH key, the GHCR login on the Pi, production settings, and the Kiosk tablet. The GitHub repo and CI already existed (ticket 01), so the wizard only logs in to `gh`.

Decisions made with the owner:
- Production settings live in `~/attendance/.env` on the Pi (mode 600), written once by the wizard. They're not GitHub secrets, and releases never handle them.
- Releases join the tailnet with a Tailscale OAuth client (Auth Keys: Write, tag `tag:ci`), not an expiring auth key.
- The Pi pulls from GHCR with a classic personal access token (`read:packages`) used for `docker login` on the Pi.

What the wizard produces:
- GitHub secrets: `TS_OAUTH_CLIENT_ID`, `TS_OAUTH_SECRET`, `PI_SSH_PRIVATE_KEY`
- GitHub variables: `PI_HOST` (the Pi's `*.ts.net` name), `PI_USER`, `PI_SSH_KNOWN_HOSTS`
- On the Pi: `~/attendance/.env` with `POSTGRES_PASSWORD`, `DATABASE_URL`, `WORKPLACE_TIME_ZONE`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `ADMIN_EMAIL` and `ADMIN_INITIAL_PASSWORD`, plus `~/attendance/backups/`.

Not verifiable until ticket 15 ships: pulling an image from GHCR (none exists yet), and the app answering at the Serve address.

**2026-11-27 (agent):** The owner ran the wizard to the end. Checked afterwards:
- GitHub secrets `TS_OAUTH_CLIENT_ID`, `TS_OAUTH_SECRET` and `PI_SSH_PRIVATE_KEY`, and variables `PI_HOST` (`raspberrypi.tailc561fe.ts.net`), `PI_USER` and `PI_SSH_KNOWN_HOSTS`, all exist.
- The deploy key logs in to the Pi over the tailnet with `StrictHostKeyChecking=yes` against `PI_SSH_KNOWN_HOSTS`.
- The Pi is aarch64 with Docker 26.1.5 and Compose 2.26.1. These are Debian's `docker.io` packages, already installed before the wizard, not Docker CE. If a Compose feature is missing at release time, upgrade Docker.
- `~/attendance/.env` (mode 600) holds all 7 settings, and `~/attendance/backups/` exists.
- The Pi's Docker is logged in to ghcr.io.
- Tailscale Serve proxies `https://raspberrypi.tailc561fe.ts.net` (tailnet only) to `127.0.0.1:3000`.
`PI_SSH_KNOWN_HOSTS` starts with a `# …` comment line from ssh-keyscan; that's harmless in a known_hosts file.
