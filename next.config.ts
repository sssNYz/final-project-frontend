import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Use worker_threads to avoid child_process.spawn in restricted environments.
    workerThreads: false,
  },
};


export default nextConfig;
