import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Debug: Check if Key is loaded (Do not log the actual key)
  console.log(`[Vite] Loading Env. API Key Present: ${!!env.VITE_TMDB_API_KEY}`);

  const proxyConfig = {
    '/api/tmdb': {
      target: 'https://api.themoviedb.org/3',
      changeOrigin: true,
      secure: false, // Sometimes needed for SSL handshake
      rewrite: (path: string) => {
        const newPath = path.replace(/^\/api\/tmdb/, '');
        const separator = newPath.includes('?') ? '&' : '?';
        // console.log(`[Proxy] Rewriting TMDB: ${newPath}`); // Uncomment to debug paths
        return `${newPath}${separator}api_key=${env.VITE_TMDB_API_KEY}`;
      },
      configure: (_proxy: any, _options: any) => {
        _proxy.on('error', (err: any, _req: any, _res: any) => {
          console.log('[Proxy] TMDB Error:', err);
        });
        _proxy.on('proxyReq', (_proxyReq: any, _req: any, _res: any) => {
          // console.log('[Proxy] Sending Request:', req.url);
        });
      }
    },
    '/api/rapid': {
      target: 'https://where-can-i-watch1.p.rapidapi.com',
      changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/api\/rapid/, ''),
      headers: {
        'x-rapidapi-key': env.VITE_RAPIDAPI_KEY,
        'x-rapidapi-host': 'where-can-i-watch1.p.rapidapi.com'
      }
    }
  };

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0', // Explicitly bind everywhere
      port: 5173,
      proxy: proxyConfig
    },
    preview: {
      host: '0.0.0.0',
      port: 5173,
      proxy: proxyConfig
    }
  }
})
