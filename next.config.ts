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
      // Profile photos are capped at 1 MB; leave headroom for multipart overhead.
      bodySizeLimit: "2mb",
    },
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
    ];
  },
};

export default withNextIntl(nextConfig);
