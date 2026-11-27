import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

const { kiosk } = schema;

type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

/** An activated, unrevoked Kiosk, as a device token resolves to it. */
export type Kiosk = {
  id: string;
  name: string;
  activatedAt: Date;
};

/** A Kiosk as the Admin sees it in the list, revoked or not. */
export type KioskListing = Kiosk & {
  /** When the Admin revoked it, or null while it is active. */
  revokedAt: Date | null;
};

export type ActivateKioskResult =
  | { ok: true; kiosk: Kiosk; token: string }
  | { ok: false; error: "missing-name" };

/**
 * Kiosk management: activating a device as a Kiosk, resolving its device
 * token, and revoking it. The token is only ever stored as a hash.
 */
export function kioskManagement(db: Database) {
  return {
    /**
     * Activates a new Kiosk and returns its device token. The token is
     * shown only here: the caller hands it to the device, and the database
     * keeps only its hash.
     */
    async activateKiosk({
      name,
      now,
    }: {
      name: string;
      now: Date;
    }): Promise<ActivateKioskResult> {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return { ok: false, error: "missing-name" };
      }
      const token = randomBytes(32).toString("base64url");
      const [activated] = await db
        .insert(kiosk)
        .values({ name: trimmedName, tokenHash: hashToken(token), activatedAt: now })
        .returning({
          id: kiosk.id,
          name: kiosk.name,
          activatedAt: kiosk.activatedAt,
        });
      return { ok: true, kiosk: activated, token };
    },

    /** The Kiosk this device token belongs to, or null if the token is unknown or its Kiosk is revoked. */
    async resolveKiosk(token: string): Promise<Kiosk | null> {
      const [found] = await db
        .select({
          id: kiosk.id,
          name: kiosk.name,
          activatedAt: kiosk.activatedAt,
        })
        .from(kiosk)
        .where(and(eq(kiosk.tokenHash, hashToken(token)), isNull(kiosk.revokedAt)));
      return found ?? null;
    },

    /** Every Kiosk ever activated, newest first, including revoked ones. */
    async listKiosks(): Promise<KioskListing[]> {
      return db
        .select({
          id: kiosk.id,
          name: kiosk.name,
          activatedAt: kiosk.activatedAt,
          revokedAt: kiosk.revokedAt,
        })
        .from(kiosk)
        .orderBy(desc(kiosk.activatedAt), desc(kiosk.id));
    },

    /**
     * Revokes a Kiosk: its device token stops resolving at once. Revoking a
     * Kiosk that is already revoked keeps the original revoked time.
     */
    async revokeKiosk({ kioskId, now }: { kioskId: string; now: Date }): Promise<void> {
      await db
        .update(kiosk)
        .set({ revokedAt: now })
        .where(and(eq(kiosk.id, kioskId), isNull(kiosk.revokedAt)));
    },
  };
}

/**
 * Device tokens are 256 random bits, so a fast hash is enough: there is
 * nothing to brute-force, unlike a password or PIN.
 */
function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
