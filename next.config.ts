import type { NextConfig } from "next";

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [];
if (process.env.S3_PUBLIC_URL) {
  const url = new URL(process.env.S3_PUBLIC_URL);
  remotePatterns.push({
    protocol: url.protocol.replace(":", "") as "http" | "https",
    hostname: url.hostname,
    pathname: `${url.pathname.replace(/\/$/, "")}/**`,
  });
}

// fotos e modelos no Vercel Blob
remotePatterns.push({ protocol: "https", hostname: "*.public.blob.vercel-storage.com", pathname: "/**" });

/** URL pública do site: definida explicitamente ou, na Vercel, o domínio de produção do projeto. */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_SITE_URL: siteUrl },
  cacheComponents: true,
  partialPrefetching: true,
  serverExternalPackages: ["sharp", "@libsql/client"],
  // modo vitrine (Vercel sem banco remoto): banco somente leitura gerado no build
  outputFileTracingIncludes: {
    "/*": ["./data/vitrine.db"],
    "/**": ["./data/vitrine.db"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [60, 75, 85],
    deviceSizes: [480, 640, 828, 1080, 1280, 1600, 1920],
    imageSizes: [96, 160, 256, 384],
    localPatterns: [
      { pathname: "/media/**", search: "" },
      { pathname: "/brand/**", search: "" },
      { pathname: "/vitrine/**", search: "" },
    ],
    remotePatterns,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
