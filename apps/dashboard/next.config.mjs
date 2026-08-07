/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Compile the workspace TypeScript packages we import directly.
  transpilePackages: ["@trader/shared", "@trader/db"],
  // Keep Prisma out of the bundle so its query engine resolves at runtime.
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
  },
  webpack: (config) => {
    // The workspace TS packages use ESM ".js" import specifiers that actually
    // point at ".ts" sources. Teach webpack to resolve them.
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

export default nextConfig;
