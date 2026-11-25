import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { createAttendance, schema, type Attendance } from "@/attendance";
import { readConfig } from "./config";

type Server = {
  attendance: Attendance;
  workplaceTimeZone: string;
};

// Kept on globalThis so dev-mode hot reloads reuse one connection pool.
const globalForServer = globalThis as typeof globalThis & {
  attendanceServer?: Server;
};

/** The app's single Attendance module, connected to the configured Postgres. */
export function getServer(): Server {
  if (!globalForServer.attendanceServer) {
    const config = readConfig();
    const db = drizzle({
      client: new Pool({ connectionString: config.databaseUrl }),
      schema,
    });
    globalForServer.attendanceServer = {
      attendance: createAttendance({ db, timeZone: config.workplaceTimeZone }),
      workplaceTimeZone: config.workplaceTimeZone,
    };
  }
  return globalForServer.attendanceServer;
}
