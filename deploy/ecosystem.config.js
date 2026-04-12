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
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1024M",
      env: {
        NODE_ENV: "production",
        HOSTNAME: "127.0.0.1",
        PORT: 3000,
      },
      env_file: "/var/www/rareimagery/.env.production",
    },
    {
      name: "rareimagery-staging",
      script: "node_modules/.bin/next",
      args: "start -p 3001",
      cwd: "/var/www/rareimagery-staging",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1024M",
      env: {
        NODE_ENV: "production",
        HOSTNAME: "127.0.0.1",
        PORT: 3001,
      },
      env_file: "/var/www/rareimagery-staging/.env.staging",
    },
  ],
};
