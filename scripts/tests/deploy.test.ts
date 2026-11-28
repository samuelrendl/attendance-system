// scripts/deploy.sh runs on the Pi (see .github/workflows/release.yml). These
// tests run it against a stub `docker` that records each call, so they check
// the deploy order and the .env handling without Docker. The README's
// "Releases" section describes the real-Docker check.
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const SCRIPT = path.resolve(import.meta.dirname, "../deploy.sh");
const SECRET = "s3cret-postgres-password";
const APP_IMAGE = "ghcr.io/samuelrendl/attendance-system";

const PI_ENV = [
  `POSTGRES_PASSWORD=${SECRET}`,
  `DATABASE_URL=postgres://attendance:${SECRET}@localhost:5432/attendance`,
  "IMAGE_TAG=v1.0.0",
  "WORKPLACE_TIME_ZONE=Europe/London",
  "",
].join("\n");

// Logs "IMAGE_TAG=<tag seen by compose> <args>" per call. STUB_FAIL makes
// one command fail ("migrate", "up" or "pull"); STUB_MISSING names an image
// that `image inspect` can't find.
const STUB_DOCKER = `#!/usr/bin/env bash
echo "IMAGE_TAG=\${IMAGE_TAG:-} $*" >> "$STUB_CALLS"
case "$*" in
  "compose config --images")
    printf 'postgres:18-alpine\\n${APP_IMAGE}:%s\\n' "\${IMAGE_TAG:-local}" ;;
  "image inspect "*)
    [[ -n "\${STUB_MISSING:-}" && "$*" == *"$STUB_MISSING"* ]] && exit 1 ;;
  "compose pull"*) [[ "\${STUB_FAIL:-}" == pull ]] && exit 1 ;;
  "compose run --rm migrate")
    [[ "\${STUB_FAIL:-}" == migrate ]] && { echo "migration 0004 failed" >&2; exit 1; } ;;
  "compose up"*) [[ "\${STUB_FAIL:-}" == up ]] && exit 1 ;;
esac
exit 0
`;

const bash = findBash();

describe.skipIf(!bash)("deploy.sh", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "deploy-test-"));
    copyFileSync(SCRIPT, path.join(dir, "deploy.sh"));
    writeFileSync(path.join(dir, "compose.yaml"), "services: {}\n");
    writeFileSync(path.join(dir, ".env"), PI_ENV);
    writeFileSync(path.join(dir, "docker"), STUB_DOCKER);
    chmodSync(path.join(dir, "docker"), 0o755);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function deploy(args: string[], stub: Record<string, string> = {}) {
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      ...stub,
      PATH: `${dir}${path.delimiter}${process.env.PATH}`,
      STUB_CALLS: path.join(dir, "calls.log"),
    };
    delete env.IMAGE_TAG;
    const result = spawnSync(bash!, [toPosix(path.join(dir, "deploy.sh")), ...args], {
      env,
      encoding: "utf8",
    });
    const output = `${result.stdout}${result.stderr}`;
    expect(output).not.toContain(SECRET);
    return { status: result.status, output };
  }

  const calls = () => {
    const log = path.join(dir, "calls.log");
    return existsSync(log) ? readFileSync(log, "utf8").trim().split("\n") : [];
  };
  const dotEnv = () => readFileSync(path.join(dir, ".env"), "utf8");

  it("migrates with the new image, records it in .env, then restarts the stack", () => {
    const { status, output } = deploy(["v1.2.0"]);

    expect(status).toBe(0);
    expect(calls()).toEqual([
      "IMAGE_TAG=v1.2.0 compose pull --quiet",
      "IMAGE_TAG=v1.2.0 compose config --images",
      "IMAGE_TAG=v1.2.0 image inspect postgres:18-alpine",
      `IMAGE_TAG=v1.2.0 image inspect ${APP_IMAGE}:v1.2.0`,
      "IMAGE_TAG=v1.2.0 compose run --rm migrate",
      "IMAGE_TAG=v1.2.0 compose up --detach --wait --wait-timeout 180 --no-build --remove-orphans",
      "IMAGE_TAG=v1.2.0 compose ps",
    ]);
    expect(dotEnv()).toBe(PI_ENV.replace("IMAGE_TAG=v1.0.0", "IMAGE_TAG=v1.2.0"));
    expect(output).toContain("Deployed v1.2.0");
  });

  it("stops after a failed migration, leaving the previous version in .env and running", () => {
    const { status, output } = deploy(["v1.2.0"], { STUB_FAIL: "migrate" });

    expect(status).not.toBe(0);
    expect(calls().at(-1)).toBe("IMAGE_TAG=v1.2.0 compose run --rm migrate");
    expect(dotEnv()).toBe(PI_ENV);
    expect(output).toContain("migration 0004 failed");
    expect(output).toContain("v1.0.0 is still serving");
  });

  it("stops before migrating when the image can't be pulled", () => {
    const { status, output } = deploy(["v1.2.0"], { STUB_MISSING: `${APP_IMAGE}:v1.2.0` });

    expect(status).not.toBe(0);
    expect(calls().some((call) => call.includes("migrate"))).toBe(false);
    expect(dotEnv()).toBe(PI_ENV);
    expect(output).toContain(`${APP_IMAGE}:v1.2.0`);
  });

  it("stops when the pull fails", () => {
    const { status } = deploy(["v1.2.0"], { STUB_FAIL: "pull" });

    expect(status).not.toBe(0);
    expect(calls()).toEqual(["IMAGE_TAG=v1.2.0 compose pull --quiet"]);
    expect(dotEnv()).toBe(PI_ENV);
  });

  it("fails the deploy when the new app doesn't become healthy, keeping its tag in .env", () => {
    const { status, output } = deploy(["v1.2.0"], { STUB_FAIL: "up" });

    expect(status).not.toBe(0);
    expect(dotEnv()).toContain("IMAGE_TAG=v1.2.0");
    expect(output).toContain("v1.2.0 didn't start");
  });

  it("adds IMAGE_TAG to an .env that has none", () => {
    const withoutTag = PI_ENV.replace("IMAGE_TAG=v1.0.0\n", "");
    writeFileSync(path.join(dir, ".env"), withoutTag.trimEnd()); // no final newline

    const { status, output } = deploy(["v1.2.0"], { STUB_FAIL: "migrate" });
    expect(status).not.toBe(0);
    expect(output).toContain("no version is recorded");

    expect(deploy(["v1.2.0"]).status).toBe(0);
    expect(dotEnv()).toBe(`${withoutTag}IMAGE_TAG=v1.2.0\n`);
  });

  it("refuses to run without the production .env", () => {
    rmSync(path.join(dir, ".env"));

    const { status, output } = deploy(["v1.2.0"]);

    expect(status).not.toBe(0);
    expect(output).toContain(".env");
    expect(calls()).toEqual([]);
  });

  it.each([[[]], [["main"]], [["1.2.0"]], [["v1.2.0;reboot"]], [["v1 2"]], [["v1.2.0", "extra"]]])(
    "rejects the arguments %j without touching anything",
    (args) => {
      const { status, output } = deploy(args);

      expect(status).toBe(2);
      expect(output).toContain("Usage: deploy.sh <version>");
      expect(calls()).toEqual([]);
      expect(dotEnv()).toBe(PI_ENV);
    },
  );
});

/**
 * A POSIX bash. On Windows, `bash` on the PATH is often WSL's, which can't
 * see this file system the same way, so use Git for Windows' bash.
 */
function findBash(): string | undefined {
  if (process.platform !== "win32") {
    return "bash";
  }
  try {
    // e.g. C:/Program Files/Git/mingw64/libexec/git-core
    const gitExecPath = execFileSync("git", ["--exec-path"], { encoding: "utf8" }).trim();
    const candidate = path.resolve(gitExecPath, "../../../bin/bash.exe");
    return existsSync(candidate) ? candidate : undefined;
  } catch {
    return undefined;
  }
}

function toPosix(file: string) {
  return file.split(path.sep).join("/");
}
