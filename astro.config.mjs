import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://jordanrblum.com',
  vite: { plugins: [tailwindcss()] },
});
