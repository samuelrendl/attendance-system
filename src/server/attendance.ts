import { nextCookies } from "better-auth/next-js";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { createAttendance, schema, type Attendance } from "@/attendance";
import { createAdminAuth, type AdminAuth } from "@/auth";
import { readConfig, type Config } from "./config";

type Server = {
  attendance: Attendance;
  adminAuth: AdminAuth;
  config: Config;
  workplaceTimeZone: string;
};

// Kept on globalThis so dev-mode hot reloads reuse one connection pool.
const globalForServer = globalThis as typeof globalThis & {
  attendanceServer?: Server;
};

/** The app's single Attendance module and Admin access, connected to the configured Postgres. */
export function getServer(): Server {
  if (!globalForServer.attendanceServer) {
    const config = readConfig();
    const db = drizzle({
      client: new Pool({ connectionString: config.databaseUrl }),
      schema,
    });
    globalForServer.attendanceServer = {
      attendance: createAttendance({ db, timeZone: config.workplaceTimeZone }),
      adminAuth: createAdminAuth({
        db,
        secret: config.authSecret,
        baseURL: config.authUrl,
        // Lets Better Auth set and clear the session cookie from Server Actions.
        plugins: [nextCookies()],
      }),
      config,
      workplaceTimeZone: config.workplaceTimeZone,
    };
  }
  return globalForServer.attendanceServer;
}
