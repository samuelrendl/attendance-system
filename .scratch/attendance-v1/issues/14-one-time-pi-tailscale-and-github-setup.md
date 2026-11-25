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

**Status:** ready-for-human

- [ ] The project is in a GitHub repo, and CI runs on push
- [ ] The Pi runs Docker and is on the tailnet, and Tailscale Serve provides an `https://…ts.net` address for the app port
- [ ] The GitHub secrets exist for the release workflow (ticket 15)
- [ ] The Pi can pull this repo's images from GHCR
- [ ] The Kiosk tablet and Admin laptop can reach the Pi over Tailscale
