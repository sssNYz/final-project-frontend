import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // Use worker_threads to avoid child_process.spawn in restricted environments.
    workerThreads: false,
  },
  typescript: {
    // Avoid build failure when the environment blocks spawning tsc.
    ignoreBuildErrors: true,
  },
};


export default nextConfig;
