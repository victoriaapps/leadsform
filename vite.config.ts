import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const corsProxyPlugin = () => ({
  name: 'cors-proxy-plugin',
  configureServer(server: any) {
    server.middlewares.use('/api/proxy', async (req: any, res: any) => {
      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Target-URL');
        res.statusCode = 200;
        res.end();
        return;
      }

      const reqUrl = req.url || '';
      const queryIndex = reqUrl.indexOf('?url=');
      let targetUrl = '';
      if (queryIndex !== -1) {
        targetUrl = decodeURIComponent(reqUrl.substring(queryIndex + 5));
      }

      if (!targetUrl && req.headers['target-url']) {
        targetUrl = req.headers['target-url'];
      }

      if (!targetUrl) {
        res.statusCode = 400;
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Falta la URL de destino (?url=...)' }));
        return;
      }

      let bodyParts: any[] = [];
      req.on('data', (chunk: any) => { bodyParts.push(chunk); });
      req.on('end', async () => {
        try {
          const bodyBuffer = Buffer.concat(bodyParts);
          const fetchRes = await fetch(targetUrl, {
            method: req.method || 'POST',
            headers: {
              'Content-Type': req.headers['content-type'] || 'application/json',
            },
            body: bodyBuffer.length > 0 ? bodyBuffer : undefined,
          });

          const resText = await fetchRes.text();
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Content-Type', fetchRes.headers.get('content-type') || 'application/json');
          res.statusCode = fetchRes.status;
          res.end(resText);
        } catch (err: any) {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message || 'Error en el proxy Vite' }));
        }
      });
    });
  }
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), corsProxyPlugin()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    env: {
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_ANON_KEY: '',
    },
  },
});
