// Runs once when the Next.js server starts, before it serves requests.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { onServerStart } = await import("./server/startup");
    await onServerStart();
  }
}
