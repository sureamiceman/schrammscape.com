/** @type {import('next').NextConfig} */
const nextConfig = {
  // The crew app's service worker (public/sw.js) must always be re-checked,
  // or phones could keep running an old version after an update.
  async headers() {
    return [
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }] },
      { source: '/app.webmanifest', headers: [{ key: 'Content-Type', value: 'application/manifest+json' }] },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

module.exports = nextConfig
