module.exports = {
  apps: [
    {
      name: "adicom99",
      script: "./node_modules/next/dist/bin/next",
      args: "start",
      cwd: __dirname,
      instances: 1,
      exec_mode: "cluster",
      autorestart: true,
      max_memory_restart: "750M",
      kill_timeout: 10000,
      listen_timeout: 10000,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        APP_VERSION: process.env.APP_VERSION || "unknown"
      }
    }
  ]
};
