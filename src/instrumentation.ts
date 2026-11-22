/**
 * Runs once per server process before any request is handled.
 * The NEXT_RUNTIME check is inlined at build time, so the Node-only module
 * below is excluded from the Edge (middleware) bundle.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
