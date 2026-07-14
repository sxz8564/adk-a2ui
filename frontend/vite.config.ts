import {defineConfig} from 'vite';

export default defineConfig({
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
