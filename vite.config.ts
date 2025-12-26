import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/api/tmdb': {
          target: 'https://api.themoviedb.org/3',
          changeOrigin: true,
          rewrite: (path) => {
            const newPath = path.replace(/^\/api\/tmdb/, '');
            const separator = newPath.includes('?') ? '&' : '?';
            return `${newPath}${separator}api_key=${env.VITE_TMDB_API_KEY}`;
          }
        },
        '/api/rapid': {
          target: 'https://where-can-i-watch1.p.rapidapi.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/rapid/, ''),
          headers: {
            'x-rapidapi-key': env.VITE_RAPIDAPI_KEY,
            'x-rapidapi-host': 'where-can-i-watch1.p.rapidapi.com'
          }
        }
      }
    }
  }
})
