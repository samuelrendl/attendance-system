import { getServer } from "./attendance";

/**
 * Creates the Admin from ADMIN_EMAIL and ADMIN_INITIAL_PASSWORD if no Admin
 * exists yet. Runs on every server start (src/instrumentation.ts); a throw
 * here stops the server from starting, so the message says what to check.
 */
export async function onServerStart() {
  try {
    const { adminAuth, config } = getServer();
    const { created } = await adminAuth.ensureAdmin(config.admin);
    if (created) {
      console.log(`Created the Admin ${config.admin.email}`);
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Couldn't check for or create the Admin on start: ${reason}. ` +
        "Check the environment variables in .env.example, that DATABASE_URL is reachable, and that migrations have run.",
      { cause: error },
    );
  }
}
