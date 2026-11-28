# Implementer brief (attendance-v1)

You implement ONE ticket of the attendance-v1 spec, in your own git worktree, on your own branch.

- **Your worktree:** `D:/Documents/projects/attendance-system-worktrees/tNN` (NN = your ticket number), already created on branch `tNN-<slug>`. Do ALL work there: `cd` into it in every shell command, and give every file tool an absolute path under it.
- Repo (main checkout, do not edit it): `d:/Documents/projects/attendance-system`
- Integration branch: `attendance-v1`
- Spec: `.scratch/attendance-v1/spec.md`. Your ticket: `.scratch/attendance-v1/issues/<NN>-*.md`
- Language: `GLOSSARY.md`. Decisions: `docs/adr/`. Layout and known issues: `README.md`. Rules: `AGENTS.md`.
- Shared notes (read whatever is relevant before starting; more may appear while you work):
  `.scratch/attendance-v1/notes/` (in the repo)
  In particular `nextjs-16.md` (this is Next.js 16.4, which differs from your training data; read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code if the notes don't cover it).

## Steps

1. **Check your base.** `git merge-base --is-ancestor attendance-v1 HEAD`. If that fails, `git reset --hard attendance-v1`. Then `pnpm install` (worktrees have no node_modules). Copy `.env.example` to `.env` if you need one.
2. **Build the ticket test-first:** call the Skill tool with `mattpocock-skills:tdd`. Seam 1 (the Attendance module in `src/attendance/`, tested against PGlite with an explicit `now`) is where nearly all tests live. The web layer stays thin: authenticate, parse, call the module, render. No domain rules in `src/app/`.
3. **Schema changes:** edit `src/attendance/schema.ts` (or the auth schema), then `pnpm db:generate` to create the migration. Never hand-edit `drizzle/meta`.
4. **Before you finish,** all of these must pass: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`. If your ticket has a Playwright test, run it too (see Ports below).
5. **Commit** on your branch, with a message like `Ticket NN: <title>`, ending with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
6. **Merge the integration tip:** `git merge attendance-v1` (it may have moved while you worked). If `drizzle/` conflicts: keep attendance-v1's migrations and meta exactly, delete your own migration file, and rerun `pnpm db:generate` so yours comes after theirs. Rerun the checks from step 4 and commit.
7. **Append a note** under `## Comments` in your ticket file: date 2026-11-27, `(agent)`, a few lines on what was built, anything you couldn't verify, and decisions later tickets should know about. Tick the acceptance boxes you met. **Don't change the `Status:` line** (the orchestrator does that).
8. Don't push, don't touch `main`, and don't edit other tickets' files.

## Ports (other implementers run in parallel)

Never use ports 5432 or 3000. For ticket NN, use database port `55NN` and app port `31NN`. Example for ticket 05:
`pnpm exec pglite-server --port=5505 --max-connections=10` (run it in the background), then
`DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5505/postgres`, `pnpm db:migrate`, `pnpm build`, `PORT=3105 pnpm test:e2e`.
Stop any servers you started before you finish.

**On Windows, stopping a background task does NOT kill its child `node` processes.** Playwright then silently reuses a stale `next start` with an old database, and tests fail for no visible reason. Before each E2E run, and again when you finish, kill whatever listens on your two ports, e.g. in PowerShell:
`Get-NetTCPConnection -LocalPort 3105,5505 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`

## Adding dependencies

pnpm 10.25's `pnpm add` crashes while `components.json` exists (see README). Add the dependency to `package.json` by hand, then run `pnpm install`. shadcn components: `pnpm dlx shadcn add <name>` may also crash. If it does, move `components.json` aside temporarily, or write the component from the shadcn source.

## Your report (keep it short, under 15 lines)

- branch name and final commit sha
- acceptance criteria not met or not verified, and why
- anything the next tickets must know that isn't already in your ticket comment
