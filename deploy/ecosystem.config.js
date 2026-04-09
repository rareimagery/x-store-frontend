// PM2 ecosystem config for RareImagery Next.js
// Usage: pm2 start deploy/ecosystem.config.js

module.exports = {
  apps: [
    {
      name: "rareimagery",
      script: "node_modules/.bin/next",
      args: "start -p 3000",
      cwd: "/var/www/rareimagery",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      // Load env from .env.production
      env_file: "/var/www/rareimagery/.env.production",
    },
  ],
};
