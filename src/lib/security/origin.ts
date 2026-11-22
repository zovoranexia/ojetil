/**
 * CSRF defence for public JSON/multipart endpoints: browsers always send
 * Origin on cross-site POSTs, so a mismatch with our own host is rejected.
 * Requests without Origin (curl, server-to-server) are allowed — they carry
 * no ambient browser credentials to abuse.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
