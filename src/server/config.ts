export type Config = {
  databaseUrl: string;
  workplaceTimeZone: string;
};

/** All configuration comes from environment variables. Read at request time, never at build time. */
export function readConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    databaseUrl: required(env, "DATABASE_URL"),
    workplaceTimeZone: required(env, "WORKPLACE_TIME_ZONE"),
  };
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value;
}
