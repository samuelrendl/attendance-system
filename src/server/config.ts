export type Config = {
  /** `DATABASE_URL`: Postgres connection string. */
  databaseUrl: string;
  /** `WORKPLACE_TIME_ZONE`: IANA time zone for days and weeks. */
  workplaceTimeZone: string;
  /** `BETTER_AUTH_SECRET`: signs Admin session cookies. At least 32 characters. */
  authSecret: string;
  /** `BETTER_AUTH_URL`: the URL the app is served at. An `https://` URL makes the session cookie Secure. */
  authUrl: string;
  /** `ADMIN_EMAIL` and `ADMIN_INITIAL_PASSWORD`: the Admin created on first start. Ignored once an Admin exists. */
  admin: { email: string; initialPassword: string };
};

/** All configuration comes from environment variables. Read at request time, never at build time. */
export function readConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    databaseUrl: required(env, "DATABASE_URL"),
    workplaceTimeZone: required(env, "WORKPLACE_TIME_ZONE"),
    authSecret: required(env, "BETTER_AUTH_SECRET"),
    authUrl: required(env, "BETTER_AUTH_URL"),
    admin: {
      email: required(env, "ADMIN_EMAIL"),
      initialPassword: required(env, "ADMIN_INITIAL_PASSWORD"),
    },
  };
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value;
}
