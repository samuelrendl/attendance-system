// Sets a new password for the Admin and ends every Admin session.
//
// `pnpm build` bundles this into dist/reset-admin-password.mjs, a single file
// with no dependencies, so it runs anywhere Node does (including the app
// container). It reads the same environment variables as the app.
//
//   node dist/reset-admin-password.mjs          prompts for the new password
//   echo "$NEW" | node dist/reset-admin-password.mjs   reads it from stdin
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { createAdminAuth } from "../src/auth";
import { readConfig } from "../src/server/config";

async function main() {
  const config = readConfig();
  const password = process.stdin.isTTY
    ? await promptForNewPassword()
    : await readFirstLine();

  const pool = new Pool({ connectionString: config.databaseUrl });
  try {
    const auth = createAdminAuth({
      db: drizzle({ client: pool }),
      secret: config.authSecret,
      baseURL: config.authUrl,
    });
    const admin = await auth.resetAdminPassword(password);
    console.log(
      `Set a new password for the Admin ${admin.email}. They need to log in again.`,
    );
  } finally {
    await pool.end();
  }
}

async function promptForNewPassword() {
  const first = await promptHidden("New Admin password: ");
  const second = await promptHidden("Repeat it: ");
  if (first !== second) {
    throw new Error("The passwords don't match. Nothing was changed.");
  }
  return first;
}

async function promptHidden(question: string) {
  process.stdout.write(question);
  // Echo nothing while the password is typed.
  const silent = new Writable({ write: (_chunk, _encoding, done) => done() });
  const rl = createInterface({ input: process.stdin, output: silent, terminal: true });
  try {
    return await rl.question("");
  } finally {
    rl.close();
    process.stdout.write("\n");
  }
}

async function readFirstLine() {
  let input = "";
  for await (const chunk of process.stdin) {
    input += chunk;
  }
  return input.split(/\r?\n/)[0] ?? "";
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
