import { defineConfig } from 'vite';

// En GitHub Pages el sitio vive en /<repo>/. BASE_PATH lo pone el workflow.
export default defineConfig({
  base: process.env.BASE_PATH || './',
  build: { target: 'es2020', assetsInlineLimit: 0 },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
} as never);
