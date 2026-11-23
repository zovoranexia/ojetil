import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Native argon2 bindings must stay out of the server bundle.
  serverExternalPackages: ["@node-rs/argon2"],
  images: {
    formats: ["image/avif", "image/webp"],
    // Small device sizes first: most visitors browse on mobile data.
    deviceSizes: [360, 414, 640, 768, 1024, 1280, 1600],
  },
  experimental: {
    serverActions: {
      // Profile photos are capped at 1 MB; news saves carry up to 4 rich-text bodies.
      bodySizeLimit: "2mb",
    },
    // Image/PDF uploads go to route handlers under /api/admin/*, which pass
    // through the middleware: it must not truncate bodies below the
    // MAX_DOCUMENT_BYTES ceiling (20 MB) plus multipart overhead.
    middlewareClientMaxBodySize: "21mb",
  },
  async headers() {
    const privateHeaders = [
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
      { key: "Cache-Control", value: "no-store" },
    ];
    return [
      { source: "/:path*", headers: securityHeaders },
      // Backoffice and admin APIs must never be indexed or cached by intermediaries.
      { source: "/admin/:path*", headers: privateHeaders },
      { source: "/api/admin/:path*", headers: privateHeaders },
      // Staff may photograph a member with the desk webcam (office registration). Allowed for the whole
      // backoffice, not one page: client-side navigation keeps the policy of the first page loaded.
      { source: "/admin/:path*", headers: [{ key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), interest-cohort=()" }] },
    ];
  },
};

export default withNextIntl(nextConfig);
