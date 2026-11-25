# 13: Production image and Compose stack

Part of: Spec: Attendance system v1 (`.scratch/attendance-v1/spec.md`)

**What to build:** Make the app run as the production stack from ADR-0001, locally with one Docker Compose command:

- a multi-stage Docker image using Next.js standalone output
- an app service
- a Postgres service with persistent data
- a one-off **migrate** service that the app waits on, so the app only starts if migrations succeed
- a nightly backup service that writes `pg_dump` files to a mounted directory, keeping a rolling window of recent dumps

The image must build for arm64 as well as amd64. CI's Playwright E2E switches to running against this Compose stack.

**Blocked by:** 01 (Walking skeleton)

**Status:** ready-for-agent

- [ ] One Compose command starts Postgres, runs migrations, then starts the app
- [ ] A failing migration stops the app from starting, and a previously running app container is left untouched
- [ ] The image uses standalone output and builds for both arm64 and amd64
- [ ] The backup service produces a restorable `pg_dump` on schedule (and on demand for testing) into a mounted directory, pruning old dumps
- [ ] All configuration comes from environment variables, and an example env file documents them
- [ ] CI runs the Playwright E2E against the Compose stack
