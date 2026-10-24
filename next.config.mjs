/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["three"],
  images: {
    remotePatterns: [
      // Allow existing external references used by the legacy site as fallbacks.
      { protocol: "https", hostname: "ui-avatars.com" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "jspm.edu.in" },
    ],
  },
  async redirects() {
    return [
      // Preserve legacy deep-link shapes -> new clean dynamic routes.
      { source: "/events/detail/:id", destination: "/events/:id", permanent: false },
    ];
  },
  async rewrites() {
    const rawBackend =
      process.env.RENDER_BACKEND_URL ||
      process.env.NEXT_PUBLIC_RENDER_BACKEND_URL ||
      process.env.BACKEND_URL;
    if (rawBackend && rawBackend.trim()) {
      const backend = rawBackend.trim().replace(/\/+$/, "");
      return {
        beforeFiles: [
          {
            source: "/api/v1/:path*",
            destination: `${backend}/api/v1/:path*`,
          },
        ],
      };
    }
    return [];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
