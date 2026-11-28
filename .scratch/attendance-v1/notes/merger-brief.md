# Merger brief (attendance-v1)

You merge one implementer's branch into the integration branch `attendance-v1`, which is checked out in the main checkout at `d:/Documents/projects/attendance-system`. Work there.

1. `git status` must be clean and the current branch must be `attendance-v1`. If it isn't, stop and report.
2. `git merge --no-ff <branch>`, with the message `Merge ticket NN: <title>` ending in `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
3. **Conflicts:**
   - `drizzle/`: keep attendance-v1's migrations and meta exactly, delete the incoming branch's conflicting migration, and rerun `pnpm db:generate`.
   - `pnpm-lock.yaml`: take attendance-v1's version, then `pnpm install` to regenerate it.
   - Code: resolve by keeping both tickets' behaviour. Read both tickets (`.scratch/attendance-v1/issues/`) when intent is unclear.
4. `pnpm install`, then all of these must pass: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`. If a check fails because of the merge, fix it in the merge commit (or in a follow-up commit). If it fails because the incoming branch itself is broken, `git merge --abort` and report.
5. Don't push. Don't change ticket `Status:` lines.

Report in under 8 lines: the merge commit sha, any conflicts and how you resolved them, and whether all checks pass.
