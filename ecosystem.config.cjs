module.exports = {
    apps: [
        {
            name: 'nextjs-frontend',
            script: 'npm',
            args: 'run start',
            cwd: '/home/deploy/final-project-frontend',
            env: {
                NODE_ENV: 'production'
            },
            error_file: './logs/nextjs-frontend-error.log',
            out_file: './logs/nextjs-frontend-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G'
        }
    ]
};
