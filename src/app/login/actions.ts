"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServer } from "@/server/attendance";

export type LogInState = { email: string; error?: string };

export async function logIn(
  _previous: LogInState,
  formData: FormData,
): Promise<LogInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const result = await getServer().adminAuth.logIn({
    email,
    password,
    headers: await headers(),
  });
  if (!result.ok) {
    return { email, error: "Wrong email or password." };
  }
  redirect("/admin");
}
