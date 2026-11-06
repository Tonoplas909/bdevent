import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const domain = fileURLToPath(new URL('./supabase/functions/_shared/domain', import.meta.url));

// Relative base so the build works from a GitHub Pages sub-path (/<repo>/).
export default defineConfig({ base: './', plugins: [react()], resolve: { alias: { '@domain': domain } } });
