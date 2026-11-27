#!/usr/bin/env bash
# Deploys one release of the Compose stack. It runs on the Pi, from
# ~/attendance (the directory it's in), next to compose.yaml and the
# production .env. The release workflow (.github/workflows/release.yml) copies
# this script and compose.yaml there, then runs:
#
#   ./deploy.sh v1.2.0
#
# Rolling back is the same command with an older tag.
#
# The order is what keeps the old version serving if anything fails (README
# "Releases"):
#   1. Pull the new images.
#   2. Run the migrations with `run --rm migrate`. It leaves the running app
#      alone; a bare `up` would remove the old app before migrate finished.
#   3. Only then record IMAGE_TAG in .env, so .env always names a version
#      whose migrations have succeeded, and a manual `docker compose up` on
#      the Pi starts that version.
#   4. Recreate the stack and wait until the app is healthy.
#
# .env holds the production secrets: this script edits its IMAGE_TAG line and
# never prints it.
set -euo pipefail

usage() {
  echo "Usage: deploy.sh <version>   (a release tag, e.g. v1.2.0)" >&2
  exit 2
}
# A Docker tag that starts with v and a digit, so nothing else gets through.
[[ $# -eq 1 && $1 =~ ^v[0-9][A-Za-z0-9._-]{0,126}$ ]] || usage
version=$1

cd "$(dirname "$0")"
if [[ ! -f .env ]]; then
  echo "No .env in $PWD. It holds the production settings; see scripts/setup-pi.sh." >&2
  exit 1
fi

previous=$(sed -n 's/^IMAGE_TAG=//p' .env | tail -n 1 | tr -d '\r"')
if [[ -n $previous ]]; then
  still_serving="$previous is still serving"
else
  still_serving="no version is recorded in .env"
fi

# Overrides .env's IMAGE_TAG wherever compose.yaml uses it, until step 3.
export IMAGE_TAG=$version

echo "==> Pulling $version"
docker compose pull --quiet
# Some Compose versions only warn when the pull fails for a service with
# `build:` (app, migrate), and would then try to build it here. So check that
# every image the stack needs is here now.
images=$(docker compose config --images)
while read -r image; do
  if ! docker image inspect "$image" >/dev/null 2>&1; then
    echo "Couldn't pull $image. Nothing was changed: $still_serving." >&2
    exit 1
  fi
done <<<"$images"

echo "==> Migrating the database for $version"
if ! docker compose run --rm migrate; then
  echo "The migrations for $version failed, so nothing was restarted: $still_serving." >&2
  exit 1
fi

# Replaces the IMAGE_TAG line (or adds one) through a temporary file, so .env
# is never half-written. mktemp creates it readable only by this user.
tmp=$(mktemp .env.XXXXXX)
trap 'rm -f "$tmp"' EXIT
awk -v line="IMAGE_TAG=$version" '
  /^IMAGE_TAG=/ { if (!done) print line; done = 1; next }
  { print }
  END { if (!done) print line }
' .env >"$tmp"
mv "$tmp" .env

echo "==> Starting $version"
if ! docker compose up --detach --wait --wait-timeout 180 --no-build --remove-orphans; then
  echo "$version didn't start. Its migrations have run. See 'docker compose logs app'." >&2
  [[ -n $previous ]] && echo "To roll back, deploy $previous again." >&2
  exit 1
fi
docker compose ps
echo "==> Deployed $version"
