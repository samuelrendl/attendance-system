# 15: Release on tag to the Pi

Part of: Spec: Attendance system v1 (`.scratch/attendance-v1/spec.md`)

**What to build:** Pushing a `v*` git tag releases the app to the Raspberry Pi, as ADR-0001 decides:

1. Build the arm64 image on GitHub's hosted ARM runner and push it to GHCR, tagged with the version.
2. Join the tailnet using the temporary Tailscale credential.
3. SSH to the Pi, set the image tag, and pull and restart the Compose stack. Migrations run before the new app container starts, and a failed migration leaves the old version serving.

Success or failure is visible in GitHub Actions. Re-running the release for an older tag rolls back.

**Blocked by:** 13 (Production image and Compose stack), 14 (One-time Pi, Tailscale and GitHub setup)

**Status:** ready-for-human

- [x] Pushing a `v*` tag builds and pushes an arm64 image to GHCR tagged with the version
- [x] The workflow deploys that version to the Pi over Tailscale SSH, and the app at the Tailscale Serve address shows the new version
- [x] A failing migration fails the workflow and leaves the previous version serving
- [ ] Re-running the release for an older tag deploys that version
- [x] Pushes and PRs to `main` don't deploy
- [x] No secrets appear in the repo or the logs

## Comments

**2026-11-27 (agent, from ticket 14):** The setup wizard (`scripts/setup-pi.sh`) creates these. Use exactly these names:
- Secrets: `TS_OAUTH_CLIENT_ID` and `TS_OAUTH_SECRET`, for `tailscale/github-action@v4` with `tags: tag:ci`. Also `PI_SSH_PRIVATE_KEY` (ed25519, stored with a trailing newline).
- Variables (`vars.*`): `PI_HOST` (the Pi's MagicDNS `*.ts.net` name), `PI_USER`, and `PI_SSH_KNOWN_HOSTS` (the Pi's ed25519 host key, keyed by `PI_HOST`). Use it with `StrictHostKeyChecking=yes`.
- On the Pi: deploy into `~/attendance/`. `~/attendance/.env` already holds every production setting, so the workflow must never print it. The Pi is already logged in to `ghcr.io`.

**2026-11-27 (agent, from ticket 13):** This corrects the sequence above. A bare `docker compose pull && docker compose up -d` is unsafe: Compose removes the old app container before migrate finishes, so a failed migration leaves nothing serving. The tested deploy, run in `~/attendance/`:
1. Copy `compose.yaml` there.
2. Upsert `IMAGE_TAG=<version>` into `~/attendance/.env` with a replace-the-line edit, never printing the file. Don't just export it, or a later manual `up` falls back to the `local` tag.
3. Run `docker compose pull && docker compose run --rm migrate && docker compose up --detach --wait`. The `run` step leaves the running app alone and exits non-zero if migrations fail, which fails the workflow before anything is replaced.

See ticket 13's comment and the README's "Production stack" section.

**2026-11-27 (agent):** Built `.github/workflows/release.yml` and `scripts/deploy.sh`. Nothing has run on GitHub or the Pi yet. I didn't push, tag or SSH anywhere.

- **Workflow.** It triggers on a `v*` tag push, plus *Run workflow* from a tag. Both jobs are guarded by `startsWith(github.ref, 'refs/tags/v')`, so a branch never deploys. `concurrency: release` runs one release at a time and never cancels one midway.
  - The **image** job runs on `ubuntu-24.04-arm` and checks that the tag looks like `v<digit>...`. It then pushes `ghcr.io/samuelrendl/attendance-system:<tag>` (linux/arm64, GHA cache) with `GITHUB_TOKEN` and `packages: write`.
  - The **deploy** job joins with `tailscale/github-action@v4` (`TS_OAUTH_CLIENT_ID`, `TS_OAUTH_SECRET`, `tags: tag:ci`, `ping: PI_HOST`). It writes `PI_SSH_PRIVATE_KEY` and `PI_SSH_KNOWN_HOSTS` into an ssh config (`StrictHostKeyChecking yes`, `BatchMode yes`). It copies `compose.yaml` and `scripts/deploy.sh` into `~/attendance/` and runs `bash attendance/deploy.sh <tag>`. The job summary links `https://PI_HOST`.
  - Actions used: checkout@v5 (as in ci.yml), docker/metadata@v6, setup-buildx@v4, login@v4, build-push@v7 (the latest majors).
- **deploy.sh** follows ticket 13's safe sequence with one change: it writes `.env` after the migrations instead of before.
  - The order is `pull`, then a check that every image is now local, then `run --rm migrate`, then the `IMAGE_TAG` upsert, then `up --detach --wait --wait-timeout 180 --no-build --remove-orphans`. So `.env` always names the last version whose migrations succeeded, and a manual `up` on the Pi can never start a version that failed to migrate.
  - The upsert replaces only the `IMAGE_TAG` line, or appends one. The Pi's `.env` has none yet, so the first release appends it. It goes through `mktemp` (mode 600) and `mv`, and the script never prints the file.
  - It rejects anything but one `v<digit>...` argument (exit 2). If a step fails, it names the version that's still serving.
- **Version shown.** The `Dockerfile` takes `ARG APP_VERSION` (default `dev`), set to the tag. It's an ENV in the builder stage, so it's baked into prerendered pages, and in the runner stage too. `src/components/app-version.tsx` shows it under the login form and in the Admin header.
- **Tests.** `scripts/tests/deploy.test.ts` has 13 vitest cases. They run `deploy.sh` against a stub `docker` and check the call order, what's in `.env`, the exit codes, and that no secret appears in the output.
  - They cover a good deploy, a failed migration, a failed pull, a missing image, an unhealthy app, `.env` without `IMAGE_TAG`, a missing `.env`, and bad arguments.
  - On Windows the test uses Git for Windows' bash, because `bash` on the PATH is WSL's.
  - vitest now also includes `scripts/**/*.test.ts`. `build-scripts.mjs` only bundles `scripts/*.ts`, so the tests stay out of `dist/`.
- **Rehearsal with the Pi's exact CLI.** I used a `debian:trixie-slim` container with Debian's `docker-cli` 26.1.5+dfsg1 and `docker-compose` 2.26.1-4. That's the same package versions as the Pi, talking to Docker Desktop. It ran `deploy.sh` under project `att15` in a scratch `~/attendance`, with a fake `.env` (no `IMAGE_TAG`, ports 5515/3115).
  - The images came from a throwaway local registry. Docker Desktop's daemon can't reach published ports on 127.0.0.1, so the registry ran with `--network host` on 127.0.0.1:45115 inside the Docker VM.
  - The test images were a real build with `APP_VERSION=v1.0.0`, plus v1.1.0 (adds a good migration) and v1.2.0 (that migration plus one that fails partway through).
  - Results:
    1. A fresh deploy of v1.0.0 succeeded. `IMAGE_TAG=v1.0.0` was appended and the login page showed `v1.0.0`.
    2. Deploying v1.1.0 ran the migration and the app came up healthy on v1.1.0.
    3. Deploying v1.2.0 exited 1 with "v1.1.0 is still serving". The app container ID was unchanged and it stayed healthy. Every poll during the deploy returned 200. `.env` still said v1.1.0. The half-run migration's table didn't exist, and the migration count was unchanged.
    4. Rolling back to v1.0.0 succeeded. Its migrate was a no-op against the newer schema, and the page showed `v1.0.0`.
    5. A tag that doesn't exist failed at the pull and changed nothing.
    6. A plain `docker compose up --detach --wait` afterwards kept v1.0.0.
  - No log contained the fake secrets.
  - Compose 2.26.1 has every flag used (`pull --quiet`, `config --images`, `run --rm`, `up --wait --wait-timeout --no-build --remove-orphans`), and `--wait` accepts the exited migrate service.
  - In 2.26.1 a failed pull is an error even for services with `build:`. Some other versions only warn, which is why the image check exists.
  - All test containers, volumes, the network, the images and the backups dir are removed.
- **Checks:** `release.yml` parses (js-yaml), and every `run:` block and `deploy.sh` pass `bash -n`. lint, typecheck, test (105) and build pass, and so do all 12 Playwright tests after merging attendance-v1. I couldn't run actionlint: a third-party linter image wasn't allowed here.

**What the owner does for the first release:**

1. Merge `attendance-v1` into `main` with a PR and wait for CI to go green. That green run is also what ticks ticket 13's last box. Check that the push to `main` started only **CI**, with no **Release** run.
2. Tag it and push the tag: `git checkout main && git pull && git tag v0.1.0 && git push origin v0.1.0`. Any `v<digit>...` name works.
3. Watch Actions → **Release**. **image** should push the image, and **deploy** should join the tailnet, ping the Pi, copy the files and print `==> Deployed v0.1.0`.
4. Check:
   - The package `attendance-system` has tag `v0.1.0` (linux/arm64) on GitHub → Packages.
   - `https://raspberrypi.tailc561fe.ts.net/login` shows `v0.1.0` under the form, and the Admin header shows it after you log in.
   - On the Pi, `grep '^IMAGE_TAG=' ~/attendance/.env` prints `IMAGE_TAG=v0.1.0`, and `cd ~/attendance && docker compose ps` shows the app healthy.
   - The deploy job's log contains no value from `.env`, and the secrets appear as `***`.
5. Rollback check:
   - Tag a later commit `v0.1.1` (or the same commit) and push it. Confirm the page shows `v0.1.1`.
   - Open v0.1.0's Release run and use **Re-run all jobs**. The page should show `v0.1.0` again.
   - Re-runs are only possible for 30 days. After that, use **Run workflow** with *Use workflow from* set to the tag.
   - Re-run v0.1.1 to go forward again.

Likely first-run snags:
- If the tailnet policy isn't allow-all, `tag:ci` needs the `tcp:22` grant to the Pi from the wizard. Without it, the `ping` or `ssh` step fails.
- If a GHCR package called `attendance-system` already existed and wasn't linked to this repo, the push gets a 403. None existed at ticket 14.
- If the Pi's PAT can't see the new private package, the pull fails. That's harmless: the deploy stops and nothing changes.

**Boxes ticked:**
- *Failing migration*: rehearsed on Compose 2.26.1. `deploy.sh` exits non-zero, and `ssh` passes that on, which fails the step.
- *Pushes and PRs*: guaranteed by the triggers and the job `if`. Confirm with step 1.

**Only after the real run:** the GHCR arm64 image box, the deploy and version box, the re-run rollback box, and "no secrets in the logs". For the repo half of that last one, nothing secret is committed.

**For later tickets:**
- Releases keep every old image on the Pi so rollbacks are fast. Prune now and then (`docker image prune -a` keeps the running ones).
- Migrations should stay additive, because a rollback runs old code against the newer schema.
- `.env` on the Pi is still never touched by releases, except its `IMAGE_TAG` line.

**2026-11-28 (agent, orchestrator):** Merged into `attendance-v1`. Set to ready-for-human, because the four unticked boxes can only be ticked by the owner's first real release, following the steps above. Resolve this ticket after that run.

**2026-11-28 (agent):** First real release. PR #1 merged to `main` (`67c88dc`), and `v0.1.0` was pushed. CI on the PR was green, including 12 Playwright tests against the Compose stack, which ticks ticket 13's last box.
- The first deploy failed safely. The app container was unhealthy, and `deploy.sh` exited 1 with "v0.1.0 didn't start". The cause was `WORKPLACE_TIME_ZONE='Prague'` in the Pi's `.env`, typed at the wizard's stage 11; the app rightly refuses a non-IANA zone. It was fixed to `Europe/Prague` on the Pi and in `.env.pi`, and the failed deploy job was re-run: `==> Deployed v0.1.0`.
- `https://raspberrypi.tailc561fe.ts.net/login` returns 200 over HTTPS and shows `v0.1.0`. `/kiosk` returns 200. `/admin` without a session redirects to `/login`.
- The run's log has no private key material, and secrets appear only as `***`.
- **Still to verify:** rollback (box 4). Push a later tag, then re-run v0.1.0's Release run and check the page shows `v0.1.0` again.
- **Follow-up:** `scripts/setup-pi.sh` should validate `WORKPLACE_TIME_ZONE` as an IANA name at stage 11, so a typo is caught before it reaches the Pi.
