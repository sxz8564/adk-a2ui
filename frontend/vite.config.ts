import {defineConfig} from 'vite';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  plugins: [
    {
      name: 'feedback-api',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/api/feedback' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk;
            });
            req.on('end', () => {
              try {
                const feedback = JSON.parse(body);
                
                // Write feedback to a file in the workspace feedback folder
                const feedbackDir = path.resolve(process.cwd(), '../feedback');
                if (!fs.existsSync(feedbackDir)) {
                  fs.mkdirSync(feedbackDir, { recursive: true });
                }
                const filename = `feedback-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.json`;
                fs.writeFileSync(
                  path.join(feedbackDir, filename),
                  JSON.stringify(feedback, null, 2),
                  'utf-8'
                );
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'success', message: 'Feedback saved' }));
              } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'error', message: err instanceof Error ? err.message : String(err) }));
              }
            });
          } else {
            next();
          }
        });
      }
    }
  ],
  server: {
    port: 5173,
    proxy: {
      '/adk': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/adk/, ''),
        headers: {
          // ADK Web rejects browser origins other than its own backend URL.
          origin: 'http://127.0.0.1:8000',
        },
      },
    },
  },
});
