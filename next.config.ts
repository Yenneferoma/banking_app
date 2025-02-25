import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true, // Recommended for debugging & performance
  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },
};

const sentryOptions = {
  org: "gomycode-ua",
  project: "javascript-nextjs",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  reactComponentAnnotation: { enabled: true },
  tunnelRoute: "/monitoring",
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
};

export default withSentryConfig(nextConfig, sentryOptions);
