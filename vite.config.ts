import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  // Only VITE_* values are exposed to the client bundle.
  const env = loadEnv(mode, process.cwd(), ['VITE_']);

  return {
    plugins: [react(), tailwindcss()],
    envPrefix: ['VITE_'],
    server: {
      // Local development: the API runs separately (npm run dev:api).
      proxy: {
        '/api': {
          target: env.VITE_DEV_API_URL || 'http://localhost:4000',
          changeOrigin: false,
        },
      },
    },
    build: {
      // Never ship source maps to production (they expose source code).
      sourcemap: false,
      minify: isProduction ? 'esbuild' : false,
      ...(isProduction
        ? { esbuild: { drop: ['console', 'debugger' as const] } }
        : {}),
    },
  };
});
