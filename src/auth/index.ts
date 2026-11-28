import { betterAuth, type BetterAuthPlugin } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as authSchema from "./schema";

export { authSchema };

/** Any Drizzle Postgres database with the migrations applied: node-postgres in the app, PGlite in tests. */
export type AuthDatabase = PgDatabase<PgQueryResultHKT, Record<string, unknown>>;

export type AdminAuthOptions = {
  db: AuthDatabase;
  /** Signs session cookies. At least 32 characters. */
  secret: string;
  /** The URL the app is served at, e.g. "https://pi.example.ts.net". Decides whether cookies are Secure. */
  baseURL: string;
  /** Extra Better Auth plugins. The web layer adds `nextCookies()`. */
  plugins?: BetterAuthPlugin[];
};

/** The one Admin, as the web layer sees it. */
export type Admin = {
  id: string;
  email: string;
};

export type LogInResult =
  | { ok: true; headers: Headers }
  | { ok: false };

const ADMIN_NAME = "Admin";

/**
 * Admin access: logging the Admin in and out, reading the Admin session,
 * creating the Admin on first start, and resetting the Admin's password.
 * Built on Better Auth (email and password, Drizzle adapter) with public
 * sign-up disabled, so nothing here or over HTTP can create a second Admin.
 */
export function createAdminAuth({
  db,
  secret,
  baseURL,
  plugins = [],
}: AdminAuthOptions) {
  const auth = betterAuth({
    appName: "Attendance",
    baseURL,
    secret,
    database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
    emailAndPassword: { enabled: true, disableSignUp: true },
    telemetry: { enabled: false },
    plugins,
  });

  async function findAdmin() {
    const context = await auth.$context;
    const [admin] = await context.internalAdapter.listUsers(1);
    return admin ?? null;
  }

  async function hashPassword(password: string) {
    const context = await auth.$context;
    const { minPasswordLength, maxPasswordLength } = context.password.config;
    if (password.length < minPasswordLength) {
      throw new Error(
        `The Admin password must be at least ${minPasswordLength} characters`,
      );
    }
    if (password.length > maxPasswordLength) {
      throw new Error(
        `The Admin password must be at most ${maxPasswordLength} characters`,
      );
    }
    return context.password.hash(password);
  }

  return {
    /** The underlying Better Auth instance. Prefer the operations below. */
    betterAuth: auth,

    /**
     * Creates the Admin if no Admin exists yet. Run on every start: once an
     * Admin exists it does nothing, even if the email or password differ.
     */
    async ensureAdmin({
      email,
      initialPassword,
    }: {
      email: string;
      initialPassword: string;
    }): Promise<{ created: boolean }> {
      if (await findAdmin()) {
        return { created: false };
      }
      const context = await auth.$context;
      const passwordHash = await hashPassword(initialPassword);
      let admin;
      try {
        admin = await context.internalAdapter.createUser(
          {
            email: email.toLowerCase(),
            name: ADMIN_NAME,
            emailVerified: true,
          },
          { method: "email-password" },
        );
      } catch (error) {
        // Another start created the Admin at the same moment.
        if (await findAdmin()) {
          return { created: false };
        }
        throw error;
      }
      await context.internalAdapter.linkAccount({
        userId: admin.id,
        providerId: "credential",
        accountId: admin.id,
        password: passwordHash,
      });
      return { created: true };
    },

    /** Sets a new password for the Admin and ends every Admin session. */
    async resetAdminPassword(newPassword: string): Promise<Admin> {
      const admin = await findAdmin();
      if (!admin) {
        throw new Error("There is no Admin yet. Start the app once to create it.");
      }
      const context = await auth.$context;
      const passwordHash = await hashPassword(newPassword);
      await context.internalAdapter.deleteUserSessions(admin.id);
      if (await context.internalAdapter.findCredentialAccount(admin.id)) {
        await context.internalAdapter.updatePassword(admin.id, passwordHash);
      } else {
        await context.internalAdapter.createAccount({
          userId: admin.id,
          providerId: "credential",
          accountId: admin.id,
          password: passwordHash,
        });
      }
      return { id: admin.id, email: admin.email };
    },

    /**
     * Logs the Admin in. On success the returned headers carry the session
     * cookie (with `nextCookies()` the cookie is also set on the response).
     */
    async logIn({
      email,
      password,
      headers = new Headers(),
    }: {
      email: string;
      password: string;
      headers?: Headers;
    }): Promise<LogInResult> {
      try {
        const result = await auth.api.signInEmail({
          body: { email, password },
          headers,
          returnHeaders: true,
        });
        return { ok: true, headers: result.headers };
      } catch (error) {
        if (error instanceof APIError && isRejectedCredentials(error)) {
          return { ok: false };
        }
        throw error;
      }
    },

    /** The Admin whose session cookie is in these request headers, or null. */
    async getAdmin(headers: Headers): Promise<Admin | null> {
      const session = await auth.api.getSession({ headers });
      if (!session) {
        return null;
      }
      return { id: session.user.id, email: session.user.email };
    },

    /** Ends the session whose cookie is in these request headers, if any. */
    async logOut(headers: Headers): Promise<void> {
      if (!(await auth.api.getSession({ headers }))) {
        return;
      }
      await auth.api.signOut({ headers });
    },
  };
}

export type AdminAuth = ReturnType<typeof createAdminAuth>;

function isRejectedCredentials(error: APIError) {
  return error.statusCode === 400 || error.statusCode === 401;
}
