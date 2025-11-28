/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    APP_NAME: '智慧棱镜系统',
    APP_DOMAIN: 'smart-prism.online',
  },
  // 允许加载外部资源
  images: {
    domains: ['smart-prism.online'],
  },
}

module.exports = nextConfig

