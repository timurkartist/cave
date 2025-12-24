module.exports = {
  apps: [
    {
      name: 'cave-game-api',
      script: 'server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: '/var/log/pm2/cave-game-error.log',
      out_file: '/var/log/pm2/cave-game-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      ignore_watch: ['node_modules', 'dist', 'logs'],
      max_memory_restart: '500M',
    },
    {
      name: 'cave-game-frontend',
      script: 'frontend-server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/pm2/cave-frontend-error.log',
      out_file: '/var/log/pm2/cave-frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      autorestart: true,
      watch: false,
      ignore_watch: ['node_modules', 'dist', 'logs'],
    },
    {
      name: 'cave-game-bot',
      script: 'bot.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/var/log/pm2/cave-bot-error.log',
      out_file: '/var/log/pm2/cave-bot-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      autorestart: true,
      watch: false,
      ignore_watch: ['node_modules', 'dist', 'logs'],
    }
  ]
};
